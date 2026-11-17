import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  action: "send" | "verify";
  giftCardCode: string;
  otpCode?: string;
}

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body: OTPRequest = await req.json();
    const { action, giftCardCode, otpCode } = body;

    if (!giftCardCode) {
      throw new Error("Gift card code is required");
    }

    // Fetch gift card
    const { data: giftCard, error: gcError } = await supabaseClient
      .from("gift_cards")
      .select("*")
      .eq("code", giftCardCode.toUpperCase())
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (gcError) {
      throw new Error(gcError.message);
    }
    if (!giftCard) {
      throw new Error("Gift card not found or inactive");
    }

    // Check if OTP is required
    if (!giftCard.require_otp) {
      return new Response(
        JSON.stringify({ success: true, otpRequired: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "send") {
      const recipientEmail: string | null = giftCard.issued_to_email || null;
      const recipientPhone: string | null = giftCard.issued_to_phone || null;

      if (!recipientEmail && !recipientPhone) {
        throw new Error("Gift card has no recipient email or phone to send OTP");
      }

      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await supabaseClient
        .from("gift_cards")
        .update({
          otp_code: otp,
          otp_expires_at: otpExpiry.toISOString(),
          otp_verified: false,
        })
        .eq("id", giftCard.id);

      const maskEmail = (e: string) => {
        const [u, d] = e.split("@");
        if (!d) return e;
        const visible = u.slice(0, Math.min(2, u.length));
        return `${visible}${"*".repeat(Math.max(1, u.length - visible.length))}@${d}`;
      };
      const maskPhone = (p: string) => p.length <= 4 ? p : `${"*".repeat(p.length - 4)}${p.slice(-4)}`;

      const maskedEmail = recipientEmail ? maskEmail(recipientEmail) : null;
      const maskedPhone = recipientPhone ? maskPhone(recipientPhone) : null;

      let emailSent = false;
      let smsSent = false;
      const errors: string[] = [];

      if (recipientEmail) {
        try {
          const otpHtml = renderIsmartEmail({
            title: "Verification Code",
            documentTitle: "Gift Card Verification",
            preheader: `Your gift card verification code is ${otp}`,
            bodyHtml: `
              <h2>Gift Card Verification</h2>
              <p>Use the following code to verify gift card <strong>${giftCard.code}</strong>:</p>
              <div class="code-box">${otp}</div>
              <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
              <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
            `,
          });
          const { error: emailErr } = await supabaseClient.functions.invoke("send-email-direct", {
            body: {
              to: recipientEmail,
              subject: "Your Gift Card Verification Code",
              html: otpHtml,
              skipCreditCheck: true,
            },
          });
          if (emailErr) throw emailErr;
          emailSent = true;
        } catch (e) {
          console.error("Email send failed:", e);
          errors.push(`email: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }

      if (recipientPhone) {
        try {
          const { error: smsErr } = await supabaseClient.functions.invoke("send-sms", {
            body: {
              to: recipientPhone,
              message: `Your gift card verification code is ${otp}. Valid for 10 minutes.`,
              type: "notification",
              skipCreditCheck: true,
            },
          });
          if (smsErr) throw smsErr;
          smsSent = true;
        } catch (e) {
          console.error("SMS send failed:", e);
          errors.push(`sms: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }

      const otpSent = emailSent || smsSent;
      const sentVia = emailSent && smsSent ? "both" : emailSent ? "email" : smsSent ? "sms" : null;

      return new Response(
        JSON.stringify({
          success: true,
          otpSent,
          sentVia,
          maskedEmail: emailSent ? maskedEmail : null,
          maskedPhone: smsSent ? maskedPhone : null,
          ...(otpSent ? {} : { error: `Failed to send OTP. ${errors.join("; ")}` }),
        }),
        { status: otpSent ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "verify") {
      if (!otpCode) {
        throw new Error("OTP code is required");
      }

      // No active OTP on the card (never sent / already consumed)
      if (!giftCard.otp_code) {
        await supabaseClient.from("gift_card_otp_attempts").insert({
          gift_card_id: giftCard.id,
          user_id: user.id,
          attempt_code: otpCode,
          is_successful: false,
        });
        throw new Error("No active verification code. Please request a new code.");
      }

      // Check expiry first for a clearer error message
      if (giftCard.otp_expires_at && new Date(giftCard.otp_expires_at) < new Date()) {
        await supabaseClient.from("gift_card_otp_attempts").insert({
          gift_card_id: giftCard.id,
          user_id: user.id,
          attempt_code: otpCode,
          is_successful: false,
        });
        throw new Error("Verification code has expired. Please request a new one.");
      }

      // Check OTP match
      if (giftCard.otp_code !== otpCode) {
        await supabaseClient.from("gift_card_otp_attempts").insert({
          gift_card_id: giftCard.id,
          user_id: user.id,
          attempt_code: otpCode,
          is_successful: false,
        });
        throw new Error("Invalid verification code");
      }

      // Mark as verified and clear the OTP so it can't be reused.
      // `otp_verified=true` is consumed by the redemption flow and reset there.
      await supabaseClient
        .from("gift_cards")
        .update({
          otp_verified: true,
          otp_code: null,
          otp_expires_at: null,
        })
        .eq("id", giftCard.id);

      await supabaseClient.from("gift_card_otp_attempts").insert({
        gift_card_id: giftCard.id,
        user_id: user.id,
        attempt_code: otpCode,
        is_successful: true,
      });

      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("Error in gift-card-otp:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
