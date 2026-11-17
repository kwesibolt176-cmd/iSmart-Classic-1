import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";
import { publicAppUrl } from "../_shared/public-app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendGiftCardRequest {
  giftCardId: string;
  sendVia?: "email" | "sms" | "both";
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  sendEmail?: boolean;
  sendSMS?: boolean;
  channel?: "sms" | "whatsapp";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body: SendGiftCardRequest = await req.json();
    const {
      giftCardId,
      recipientEmail,
      recipientPhone,
      recipientName,
      sendEmail = true,
      sendSMS = false,
    } = body;

    if (!giftCardId) throw new Error("Gift card ID is required");

    const { data: giftCard, error: gcError } = await supabaseClient
      .from("gift_cards")
      .select("*")
      .eq("id", giftCardId)
      .maybeSingle();

    if (gcError) throw new Error(`Gift card lookup failed: ${gcError.message}`);
    if (!giftCard) throw new Error(`Gift card not found for id: ${giftCardId}`);

    const { data: businessProfile } = await supabaseClient
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", giftCard.user_id)
      .maybeSingle();

    const businessName = businessProfile?.business_name || "iSmartPay";

    const updateData: Record<string, unknown> = {
      sent_at: new Date().toISOString(),
    };
    if (recipientEmail) updateData.issued_to_email = recipientEmail;
    if (recipientPhone) updateData.issued_to_phone = recipientPhone;
    if (recipientName) updateData.issued_to_name = recipientName;
    await supabaseClient.from("gift_cards").update(updateData).eq("id", giftCardId);

    const baseUrl = publicAppUrl();
    const giftCardUrl = `${baseUrl}/gift-card?code=${giftCard.code}`;
    const amount = giftCard.initial_balance?.toFixed(2) || "0.00";

    const emailHtml = renderIsmartEmail({
      title: "You've Received a Gift Card 🎁",
      documentTitle: `GHS ${amount} Gift Card`,
      preheader: `${businessName} sent you a GHS ${amount} gift card`,
      bodyHtml: `
        <h2>Hi ${recipientName || "Friend"},</h2>
        <p>You've received a gift card from <strong>${businessName}</strong>!</p>
        <div style="background:linear-gradient(135deg,#011272 0%,#7cb342 100%);border-radius:16px;padding:28px;margin:18px 0;text-align:center;color:white;">
          <div style="font-size:14px;opacity:0.9;">Gift Card Value</div>
          <div style="font-size:34px;font-weight:bold;margin:8px 0;">GHS ${amount}</div>
          <div style="margin-top:12px;font-size:16px;letter-spacing:3px;">${giftCard.code}</div>
        </div>
        <p style="text-align:center;"><a class="btn" href="${giftCardUrl}">Redeem Gift Card</a></p>
        <p style="color:#666;font-size:13px;text-align:center;">
          ${giftCard.expires_at ? `Valid until ${new Date(giftCard.expires_at).toLocaleDateString()}` : "No expiration date"}
        </p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    });

    let emailResult: any = null;
    let smsResult: any = null;

    if (sendEmail && recipientEmail) {
      const r = await sendIMailMessage({
        channel: "email",
        recipient: recipientEmail,
        message: emailHtml,
        subject: `🎁 You've received a GHS ${amount} Gift Card from ${businessName}!`,
        notification_type: "notification",
        message_form: "html",
      });
      emailResult = { ok: r.ok, status: r.status };
    }

    if (sendSMS && recipientPhone) {
      const smsMessage = `You've received a GHS ${amount} Gift Card from ${businessName}! Code: ${giftCard.code}. Redeem at: ${giftCardUrl}`;
      const r = await sendIMailMessage({
        channel: "sms",
        recipient: recipientPhone,
        message: smsMessage,
        notification_type: "notification",
        message_form: "plain",
      });
      smsResult = { ok: r.ok, status: r.status };
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: { email: emailResult, sms: smsResult },
        message: "Gift card delivered via iSmart",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    console.error("Error in send-gift-card:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
