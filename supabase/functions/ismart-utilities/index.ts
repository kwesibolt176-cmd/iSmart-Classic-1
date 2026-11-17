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

    // Fallback logic for recipientid - required for most utility actions
    const finalUserId = userId || params.businessId || ismartUserId || "anonymous";

    const client = new ISmartFullClient(apiKey, accessToken || undefined, finalUserId);

    let result;

    switch (action) {
      // Billers
      case "fetchAllBillers":
        result = await client.fetchAllBillers();
        break;

      case "fetchBillerItems":
        result = await client.fetchBillerItems(params.billerId);
        break;

      // Electricity
      case "queryElectricity":
        result = await client.queryElectricity(params.data || params);
        break;

      case "buyElectricity":
        result = await client.buyElectricity(params.data || params);
        break;

      // Water
      case "queryWater":
        result = await client.queryWater(params.data || params);
        break;

      case "buyWater":
        result = await client.buyWater(params.data || params);
        break;

      // MTN Data
      case "queryMTNData":
        result = await client.queryMTNData(params.data || params);
        break;

      case "buyMTNData":
        result = await client.buyMTNData(params.data || params);
        break;

      // Airtime
      case "buyMTNAirtime":
        result = await client.buyMTNAirtime(params.data || params);
        break;

      case "buyTelecelAirtime":
        result = await client.buyTelecelAirtime(params.data || params);
        break;

      case "buyATAirtime":
        result = await client.buyATAirtime(params.data || params);
        break;

      // MTN Broadband
      case "queryMTNBroadband":
        result = await client.queryMTNBroadband(params.data || params);
        break;

      case "buyMTNBroadband":
        result = await client.buyMTNBroadband(params.data || params);
        break;
      
      // Telecel Broadband
      case "queryTelecelBroadband":
        result = await client.queryTelecelBroadband(params.data || params);
        break;

      case "buyTelecelBroadband":
        result = await client.buyTelecelBroadband(params.data || params);
        break;

      // Telecel Data
      case "queryTelecelData":
        result = await client.queryTelecelData(params.data || params);
        break;

      case "buyTelecelData":
        result = await client.buyTelecelData(params.data || params);
        break;

      // AT Data
      case "queryATData":
        result = await client.queryATData(params.data || params);
        break;

      case "buyATData":
        result = await client.buyATData(params.data || params);
        break;

      // TV Services
      case "queryDStv":
        result = await client.queryDStv(params.data || params);
        break;

      case "buyDStv":
        result = await client.buyDStv(params.data || params);
        break;

      case "queryGOtv":
        result = await client.queryGOtv(params.data || params);
        break;

      case "buyGOtv":
        result = await client.buyGOtv(params.data || params);
        break;

      case "queryStarTimes":
        result = await client.queryStarTimes(params.data || params);
        break;

      case "buyStarTimes":
        result = await client.buyStarTimes(params.data || params);
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
    console.error("iSmart utilities error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
