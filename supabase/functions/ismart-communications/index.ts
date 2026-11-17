import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ISmartFullClient, getISmartCredentials } from "../_shared/ismart-full-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ismartAccessToken, ismartUserId, ...params } = await req.json();

    const { apiKey, accessToken, userId } = await getISmartCredentials(supabase, { ismartAccessToken, ismartUserId });
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "iSmart API key not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new ISmartFullClient(apiKey, accessToken || undefined, userId || undefined);

    let result;

    switch (action) {
      case "sendSMS":
        result = await client.sendSMS({
          to: params.to,
          message: params.message,
          senderId: params.senderId,
        });
        break;

      case "getSMSBalance":
        result = await client.getSMSBalance();
        break;

      case "getSMSHistory":
        result = await client.getSMSHistory(params.page, params.limit);
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("iSmart communications error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
