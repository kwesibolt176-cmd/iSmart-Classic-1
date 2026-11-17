import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, token, password, pin } = await req.json();
    if (!action || !token) return json({ error: "Missing action or token" }, 400);

    const { data: staff, error } = await admin
      .from("staff")
      .select("id, name, email, user_id, role_id, invitation_sent_at, invitation_accepted_at")
      .eq("invitation_token", token)
      .maybeSingle();

    if (error || !staff) return json({ error: "Invalid invitation" }, 404);
    if (staff.invitation_accepted_at) return json({ error: "Invitation already used", status: "accepted" }, 410);

    if (staff.invitation_sent_at) {
      const days = (Date.now() - new Date(staff.invitation_sent_at).getTime()) / 86400000;
      if (days > 7) return json({ error: "Invitation expired", status: "expired" }, 410);
    }

    let roleName = "Staff";
    if (staff.role_id) {
      const { data: r } = await admin.from("staff_roles").select("name").eq("id", staff.role_id).maybeSingle();
      if (r?.name) roleName = r.name;
    }

    let businessName = "Unknown Business";
    const { data: biz } = await admin
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", staff.user_id)
      .maybeSingle();
    if (biz?.business_name) businessName = biz.business_name;

    if (action === "validate") {
      return json({
        staffId: staff.id,
        staffName: staff.name,
        email: staff.email || "",
        businessName,
        roleName,
      });
    }

    if (action === "accept") {
      if (!password || typeof password !== "string" || password.length < 6)
        return json({ error: "Password must be at least 6 characters" }, 400);
      if (!pin || !/^\d{4}$/.test(pin)) return json({ error: "PIN must be 4 digits" }, 400);
      if (!staff.email) return json({ error: "Staff email missing" }, 400);

      // Create or find auth user
      let authUserId: string | null = null;
      let existedAlready = false;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: staff.email,
        password,
        email_confirm: true,
        user_metadata: { staff_id: staff.id, full_name: staff.name },
      });

      if (createErr) {
        const msg = (createErr.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          // Email already has an account — do NOT overwrite their password.
          // They keep their existing login; we just link the staff record and set the PIN.
          const { data: list } = await admin.auth.admin.listUsers();
          const found = list?.users?.find((u) => u.email?.toLowerCase() === staff.email!.toLowerCase());
          if (!found) return json({ error: "Email exists but user not found" }, 400);
          authUserId = found.id;
          existedAlready = true;
        } else {
          return json({ error: createErr.message }, 400);
        }
      } else {
        authUserId = created.user?.id ?? null;
      }


      if (!authUserId) return json({ error: "Failed to create user" }, 500);

      const { error: updErr } = await admin
        .from("staff")
        .update({
          auth_user_id: authUserId,
          pin,
          invitation_accepted_at: new Date().toISOString(),
          invitation_token: null,
          access_status: "active",
          is_active: true,
        })
        .eq("id", staff.id);

      if (updErr) return json({ error: updErr.message }, 500);

      return json({
        ok: true,
        existed: existedAlready,
        message: existedAlready
          ? "This email already has an account — your existing password was kept. PIN has been set."
          : "Account created",
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("staff-invite error:", e);
    return json({ error: e.message || "Server error" }, 500);
  }
});
