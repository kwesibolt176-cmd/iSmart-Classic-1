import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ghanaPhoneKey, PHONE_IN_USE_MESSAGE } from "../_shared/phone-key.ts";

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

    const { purpose, code, business_id } = await req.json();
    if (!["email", "phone"].includes(purpose) || !code || !business_id) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: ownedBusiness } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("id", business_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ownedBusiness) {
      return new Response(JSON.stringify({ error: "Business access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: otp, error: otpErr } = await supabase
      .from("verification_otps")
      .select("*")
      .eq("user_id", userId)
      .eq("purpose", purpose)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr) throw otpErr;
    if (!otp) {
      return new Response(JSON.stringify({ success: false, error: "No active OTP. Please request a new code." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(otp.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: "OTP expired. Please request a new code." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (otp.attempts >= 5) {
      return new Response(JSON.stringify({ success: false, error: "Too many attempts. Please request a new code." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hash = await sha256(String(code).trim());
    if (hash !== otp.code_hash) {
      await supabase.from("verification_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ success: false, error: "Invalid code" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneInUse = () => new Response(JSON.stringify({ success: false, error: PHONE_IN_USE_MESSAGE }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // One phone number may verify only one business (QA BUG-11).
    const phoneKey = purpose === "phone" ? ghanaPhoneKey(otp.destination) : null;
    if (purpose === "phone") {
      if (!phoneKey) {
        return new Response(JSON.stringify({ success: false, error: "Invalid phone number. Please request a new code." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: taken, error: takenErr } = await supabase
        .from("business_verifications")
        .select("id")
        .eq("verified_phone", phoneKey)
        .eq("phone_verified", true)
        .neq("business_id", business_id)
        .limit(1);
      if (takenErr) throw takenErr;
      if (taken && taken.length > 0) return phoneInUse();
    }

    // Mark consumed
    await supabase.from("verification_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    // Upsert business_verifications (row may not exist yet)
    const now = new Date().toISOString();
    const update: Record<string, unknown> = purpose === "email"
      ? { email_verified: true, email_verified_at: now }
      : { phone_verified: true, phone_verified_at: now, verified_phone: phoneKey };

    const { error: updErr } = await supabase
      .from("business_verifications")
      .upsert({ business_id, ...update }, { onConflict: "business_id" });
    // 23505: another business verified this number between the check and the write.
    if (updErr?.code === "23505") return phoneInUse();
    if (updErr) throw updErr;


    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("verify-verification-otp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
