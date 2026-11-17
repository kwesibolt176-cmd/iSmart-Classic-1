const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retired because the legacy local balance update was non-atomic. The Merchant
// API disbursement flow is the authoritative, idempotent payout path.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify({ success: false, error: "This legacy withdrawal endpoint has been retired. Use the Merchant API disbursement flow." }), {
    status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
