import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { merchantRequest, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { publicAppUrl } from "../_shared/public-app-url.ts";
import { getMerchantSession, serviceClient } from "../_shared/merchant-session.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const sameAmount = (left: number, right: unknown) =>
  Number.isFinite(left) && Number.isFinite(Number(right)) && Math.round(left * 100) === Math.round(Number(right) * 100);

const authenticatedUserId = async (req: Request, supabase: ReturnType<typeof serviceClient>) => {
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return null;
  const { data, error } = await supabase.auth.getUser(bearer);
  return error ? null : data.user?.id || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const body = await req.json();
    const requestedAmount = Number(body.amount);
    const requestedOrderId = String(body.orderId || "");
    const requestedReference = String(body.orderNumber || requestedOrderId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    let merchantUserId = await authenticatedUserId(req, supabase);
    if (!requestedReference || !Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > 1_000_000) {
      return json({ success: false, error: "reference and a valid positive amount are required" }, 400);
    }
    if (!merchantUserId && !requestedOrderId) {
      return json({ success: false, error: "A public payment must reference an existing order" }, 400);
    }

    let amount = requestedAmount;
    let reference = requestedReference;

    // Public checkout callers cannot choose the merchant, amount, or reference.
    // Resolve those values from an already-created, payable server-side record.
    if (!merchantUserId) {
      const { data: order } = await supabase.from("orders")
        .select("user_id,order_number,total,status,payment_link_expires_at")
        .eq("id", requestedOrderId).maybeSingle();
      if (order) {
        if (!["pending", "preparing", "ready"].includes(order.status) ||
          (order.payment_link_expires_at && new Date(order.payment_link_expires_at).getTime() <= Date.now())) {
          return json({ success: false, error: "This order is no longer payable" }, 409);
        }
        if (!sameAmount(requestedAmount, order.total)) {
          return json({ success: false, error: "The payment amount does not match the order" }, 409);
        }
        merchantUserId = order.user_id;
        amount = Number(order.total);
        reference = String(order.order_number).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
      } else {
        const { data: giftCard } = await supabase.from("gift_cards")
          .select("user_id,code,initial_balance,status,expiry_date")
          .eq("id", requestedOrderId).maybeSingle();
        if (!giftCard || giftCard.status !== "inactive" ||
          (giftCard.expiry_date && new Date(giftCard.expiry_date).getTime() <= Date.now())) {
          return json({ success: false, error: "A payable order could not be found" }, 404);
        }
        if (!sameAmount(requestedAmount, giftCard.initial_balance)) {
          return json({ success: false, error: "The payment amount does not match the gift card" }, 409);
        }
        merchantUserId = giftCard.user_id;
        amount = Number(giftCard.initial_balance);
        reference = `GC-${String(giftCard.code).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 61)}`;
      }
    }

    if (!merchantUserId || !reference) return json({ success: false, error: "The payment request is invalid" }, 400);

    const session = await getMerchantSession(supabase, merchantUserId);
    if (!session.business_id) return json({ success: false, error: "Merchant business is not linked" }, 409);
    // Redirect destinations are deployment configuration, never caller-controlled.
    const appUrl = publicAppUrl();
    const checkout = await merchantRequest<{ id: string; url: string; reference: string }>(
      `/v1/businesses/${encodeURIComponent(session.business_id)}/checkouts`,
      {
        method: "POST",
        accessToken: session.access_token,
        idempotencyKey: `checkout:${reference}`,
        body: {
          reference,
          amountType: "fixed",
          amount: amount.toFixed(2),
          currency: "GHS",
          usage: "single",
          description: String(body.narration || body.orderNumber || "Payment").slice(0, 140),
          expiresInMinutes: 60,
          successUrl: `${appUrl}/payment-callback?reference=${encodeURIComponent(reference)}`,
          cancelUrl: `${appUrl}/payment-callback?reference=${encodeURIComponent(reference)}&cancelled=1`,
        },
      },
    );

    const { data: business } = await supabase.from("business_profiles")
      .select("id")
      .eq("user_id", merchantUserId)
      .maybeSingle();
    if (business) {
      await supabase.from("collections").insert({
        business_id: business.id,
        reference,
        amount,
        fee: 0,
        net_amount: amount,
        collection_type: "hosted_checkout",
        status: "pending",
        payer_name: String(body.customerName || "").slice(0, 100) || null,
        payer_phone: String(body.customerPhone || "").replace(/[^+\d]/g, "").slice(0, 16) || null,
        currency: "GHS",
        metadata: {
          merchant_checkout_id: checkout.id,
          checkout_url: checkout.url,
          order_id: body.orderId,
          order_number: body.orderNumber,
        },
      });
    }

    return json({
      success: true,
      reference,
      checkoutUrl: checkout.url,
      data: checkout,
      message: "Redirecting to iSmartPay checkout...",
    });
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});
