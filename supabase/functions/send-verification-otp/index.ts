import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";
import { PHONE_IN_USE_MESSAGE } from "../_shared/phone-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const purpose: "email" | "phone" = body.purpose;
    const destination: string = (body.destination ?? "").toString().trim();

    if (!["email", "phone"].includes(purpose) || !destination) {
      return new Response(JSON.stringify({ error: "Invalid purpose or destination" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: businesses } = await supabase
      .from("business_profiles")
      .select("id,business_email,business_phone,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const digits = (v: string) => (v || "").replace(/\D/g, "");
    const phoneMatches = (a: string, b: string) => {
      const da = digits(a), db = digits(b);
      return !!da && !!db && (da === db || da.slice(-9) === db.slice(-9));
    };

    const matched = (businesses || []).some((b: any) =>
      purpose === "email"
        ? (b.business_email || "").trim().toLowerCase() === destination.toLowerCase()
        : phoneMatches(b.business_phone || "", destination)
    );

    if (!matched) {
      return new Response(JSON.stringify({ error: "Destination does not match your business profile" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize Ghana numbers to the same format used everywhere else in the
    // platform for SMS delivery: 233XXXXXXXXX (no plus sign).
    // Handles messy stored values like +2330509705542 (233 + national 0 prefix)
    // and +233233241234568 (duplicated country code).
    let sendTo = destination;
    if (purpose === "phone") {
      let d = digits(destination);
      while (d.startsWith("233")) d = d.slice(3);
      d = d.replace(/^0+/, "");
      const subscriber = d.slice(-9);
      if (subscriber.length !== 9) {
        return new Response(JSON.stringify({ success: false, error: `Invalid phone number on file: ${destination}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sendTo = `233${subscriber}`;

      // One phone number may verify only one business (QA BUG-11).
      const ownIds = (businesses || []).map((b: any) => b.id).filter(Boolean);
      let inUse = supabase
        .from("business_verifications")
        .select("id")
        .eq("verified_phone", sendTo)
        .eq("phone_verified", true)
        .limit(1);
      if (ownIds.length) inUse = inUse.not("business_id", "in", `(${ownIds.join(",")})`);
      const { data: taken, error: takenErr } = await inUse;
      if (takenErr) throw takenErr;
      if (taken && taken.length > 0) {
        return new Response(JSON.stringify({ success: false, error: PHONE_IN_USE_MESSAGE }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }




    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate previous unused OTPs of same purpose
    await supabase
      .from("verification_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("purpose", purpose)
      .is("consumed_at", null);

    const { error: insErr } = await supabase.from("verification_otps").insert({
      user_id: userId, purpose, destination, code_hash, expires_at,
    });
    if (insErr) throw insErr;

    const plainMessage = `Your iSmartPay verification code is ${code}. It expires in 10 minutes.`;
    const emailHtml = renderIsmartEmail({
      title: purpose === "email" ? "Verify Your Email" : "Verify Your Number",
      documentTitle: "iSmartPay Verification Code",
      preheader: `Your iSmartPay verification code is ${code}`,
      bodyHtml: `
        <h2>Hello,</h2>
        <p>Use the verification code below to confirm your ${purpose === "email" ? "email address" : "phone number"} on iSmartPay.</p>
        <div class="code-box">${code}</div>
        <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, please ignore this message.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    });

    const result = await sendIMailMessage({
      channel: purpose === "email" ? "email" : "sms",
      recipient: sendTo,
      message: purpose === "email" ? emailHtml : plainMessage,
      notification_type: "otp",
      message_form: purpose === "email" ? "html" : "plain",
      subject: purpose === "email" ? "Your iSmartPay verification code" : undefined,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: (result.body && (result.body.error || result.body.message)) || `Failed to send ${purpose} OTP`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message: `OTP sent to ${destination}` }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-verification-otp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
