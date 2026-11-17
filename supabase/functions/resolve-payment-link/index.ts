import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const { code } = await req.json();
    const shortCode = String(code || "");
    if (!/^[A-Za-z0-9]{8,20}$/.test(shortCode)) return json({ error: "Payment link not found" }, 404);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data, error } = await supabase.from("payment_links")
      .select("redirect_url,is_active,expires_at")
      .eq("short_code", shortCode)
      .maybeSingle();
    if (error) throw error;
    if (!data?.is_active || !data.redirect_url || (data.expires_at && Date.parse(data.expires_at) <= Date.now())) {
      return json({ error: "This payment link is unavailable or has expired" }, 404);
    }

    const url = new URL(data.redirect_url);
    if (url.protocol !== "https:") return json({ error: "Payment link is unavailable" }, 503);
    return json({ url: url.toString() });
  } catch {
    return json({ error: "Payment link is temporarily unavailable" }, 503);
  }
});
