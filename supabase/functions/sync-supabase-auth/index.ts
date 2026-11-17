const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retired because accepting caller-supplied credentials allowed account takeover.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify({ success: false, error: "This legacy authentication endpoint has been retired. Use merchant authentication." }), {
    status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
