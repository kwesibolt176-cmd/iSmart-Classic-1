import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { MerchantApiError, merchantRequest, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { financialReference, normalizeProvider, requireClientRequestId } from "../_shared/financial-request.ts";
import { getMerchantSession, merchantRequestWithSessionRefresh, requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";
import { normalizeVerifiedMsisdn, readVerificationProof, toMerchantMsisdn } from "../_shared/verification-proof.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const user = await requirePortalUser(req, supabase);
    const input = await req.json();
    const amount = Number(input.amount);
    const channel = String(input.channel || "MOBILE_MONEY").toUpperCase();
    const isBank = channel === "BANK";
    const provider = normalizeProvider(isBank ? input.senderBank : input.provider);
    const payerValue = String(isBank ? input.senderAccountNumber : input.phoneNumber || "").trim();
    if (!input.businessId || !provider || !payerValue || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return json({ success: false, error: "business, provider, payer and a valid positive amount are required" }, 400);
    }
    const requestId = requireClientRequestId(input.clientRequestId);
    const { data: owned, error: ownedError } = await supabase.from("business_profiles")
      .select("id,ismart_business_id,merchant_business_id")
      .eq("id", input.businessId).eq("user_id", user.id).maybeSingle();
    if (ownedError) throw ownedError;
    if (!owned) return json({ success: false, error: "Business access denied" }, 403);

    const session = await getMerchantSession(supabase, user.id);
    if (!session.business_id) return json({ success: false, error: "Merchant business is not linked" }, 409);
    const linkedBusinessId = owned.merchant_business_id || owned.ismart_business_id;
    if (!linkedBusinessId || linkedBusinessId !== session.business_id) {
      return json({ success: false, error: "Merchant session does not match this business" }, 403);
    }
    if (isBank) {
      const methods = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) =>
        merchantRequest<{ items?: Array<{ provider?: string; rail?: string }> }>(
          `/v1/businesses/${encodeURIComponent(session.business_id!)}/wallet/payment-methods`,
          { accessToken },
        )
      );
      const supported = (methods.items || []).some((method) =>
        String(method.rail || "").toLowerCase() === "collection" &&
        normalizeProvider(method.provider) === provider
      );
      if (!supported) {
        throw new MerchantApiError(422, "unsupported_payment_rail", "Bank collection is not supported by the merchant payment processor");
      }
    }
    if (!isBank) {
      const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const proof = secret ? await readVerificationProof(String(input.verificationProof || ""), secret) : null;
      if (
        !proof || proof.userId !== user.id || proof.businessId !== input.businessId ||
        proof.merchantBusinessId !== session.business_id || proof.provider !== provider ||
        proof.destination !== normalizeVerifiedMsisdn(payerValue)
      ) {
        throw new MerchantApiError(403, "verification_required", "Verify the mobile money number again before continuing");
      }
    }
    const reference = financialReference("TOPUP", requestId);
    const collection = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) =>
      merchantRequest<Record<string, unknown>>(
        `/v1/businesses/${encodeURIComponent(session.business_id!)}/wallet/collections`, {
        method: "POST",
        accessToken,
        idempotencyKey: `collection:${reference}`,
        body: {
          reference,
          amount: amount.toFixed(2),
          currency: String(input.currency || "GHS").toUpperCase(),
          provider,
          payer: { type: isBank ? "account" : "msisdn", value: isBank ? payerValue : toMerchantMsisdn(payerValue) },
          note: String(isBank && input.transactionReference ? `Bank top-up ${input.transactionReference}` : "Wallet top-up").slice(0, 50),
        },
      }),
    );

    const status = String(collection.status || "accepted").toLowerCase();
    const row = {
      business_id: input.businessId,
      reference,
      amount,
      fee: Number(collection.fee || 0),
      net_amount: Number(collection.recipientAmount || amount),
      collection_type: "wallet_topup",
      status: ["failed", "expired"].includes(status) ? "failed" : "pending",
      payer_name: input.senderAccountName || `${input.firstName || ""} ${input.lastName || ""}`.trim() || null,
      payer_phone: isBank ? null : normalizeVerifiedMsisdn(payerValue),
      currency: String(input.currency || "GHS").toUpperCase(),
      failure_reason: collection.failureReason || null,
      metadata: { merchant_response: collection, channel, provider },
    };
    const { data: existing, error: lookupError } = await supabase.from("collections")
      .select("id,business_id").eq("reference", reference).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.business_id !== input.businessId) {
      return json({ success: false, error: "Request reference conflict" }, 409);
    }
    const auditWrite = existing
      ? await supabase.from("collections").update(row).eq("id", existing.id).eq("business_id", input.businessId)
      : await supabase.from("collections").insert(row);
    if (auditWrite.error) {
      return json({ success: false, reference, error: "Payment was accepted but its audit record could not be saved; contact support with the reference" }, 500);
    }
    return json({
      success: !["failed", "expired"].includes(status),
      reference,
      message: isBank ? "Bank debit submitted for processing" : "Check your phone for the payment prompt",
      data: collection,
    });
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});
