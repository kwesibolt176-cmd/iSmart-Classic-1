import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify({
    error: {
      code: "endpoint_retired",
      message: "This endpoint has been retired. Use the authenticated merchant checkout or wallet collection endpoint.",
    },
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
