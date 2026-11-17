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

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, code: "ISMART_UNAUTHORIZED", error: "Not authenticated with iSmart. Please login first." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new ISmartFullClient(apiKey, accessToken, userId || undefined);

    let result;

    switch (action) {
      // Business Info
      case "getBusinessInfo":
        result = await client.getBusinessInfo(params.businessId);
        break;

      case "updateBusinessInfo":
        result = await client.updateBusinessInfo(params.businessId, params.data || params);
        break;

      case "getBusinessVerificationStatus":
        result = await client.getBusinessVerificationStatus(params.businessId);
        break;

      case "getBusinessVerificationLevel":
        result = await client.getBusinessVerificationLevel(params.businessId);
        break;

      // Business Documents
      case "uploadBusinessDocuments":
        result = await client.uploadBusinessDocuments(params.businessId, params.data || params);
        break;

      case "getBusinessDocuments":
        result = await client.getBusinessDocuments(params.businessId);
        break;

      // Business Owners
      case "addBusinessOwner":
        result = await client.addBusinessOwner(params.businessId, params.data || params);
        break;

      case "getBusinessOwners":
        result = await client.getBusinessOwners(params.businessId);
        break;

      // Business Accounts
      case "getBusinessAccounts":
        result = await client.getBusinessAccounts(params.businessId);
        break;

      case "addBusinessAccount":
        result = await client.addBusinessAccount(params.businessId, params.data || params);
        break;

      // Teams
      case "getTeams":
        result = await client.getTeams(params.businessId);
        break;

      case "createTeam":
        result = await client.createTeam(params.businessId, params.data || params);
        break;

      case "updateTeam":
        result = await client.updateTeam(params.teamId, params.data || params);
        break;

      case "getTeamMembers":
        result = await client.getTeamMembers(params.teamId);
        break;

      case "addTeamMember":
        result = await client.addTeamMember(params.teamId, params.data || params);
        break;

      case "removeTeamMember":
        result = await client.removeTeamMember(params.teamId, params.memberId);
        break;

      case "getTeamDetails":
        result = await client.getTeamDetails(params.teamId);
        break;

      // Settlements (admin)
      case "getSettlementsReport":
        result = await client.getSettlementsReport(params);
        break;

      case "getAdminSettlements":
        result = await client.getAdminSettlements(params);
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
    console.error("iSmart business error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
