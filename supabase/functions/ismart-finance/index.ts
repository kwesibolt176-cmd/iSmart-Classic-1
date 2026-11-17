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
      // Disbursements
      case "createDisbursement":
        result = await client.createDisbursement(params.data || params);
        break;

      case "getDisbursements":
        result = await client.getDisbursements(params.page, params.limit);
        break;

      case "getDisbursement":
        result = await client.getDisbursement(params.disbursementId);
        break;

      case "updateDisbursement":
        result = await client.updateDisbursement(params.disbursementId, params.data);
        break;

      case "deleteDisbursement":
        result = await client.deleteDisbursement(params.disbursementId);
        break;

      case "processDisbursement":
        result = await client.processDisbursement(params.disbursementId);
        break;

      case "bulkDisbursement":
        result = await client.bulkDisbursement(params.data || params);
        break;

      case "walletTransfer":
        result = await client.walletTransfer(params.data || params);
        break;

      // Payroll
      case "processEmployeePayments":
        result = await client.processEmployeePayments(params.data || params);
        break;

      // Settlement Request
      case "createSettlementRequest":
        result = await client.createSettlementRequest(params.data || params);
        break;

      // Settlement Accounts
      case "getSettlementAccounts":
        result = await client.getSettlementAccounts();
        break;

      case "addSettlementAccount":
        result = await client.addSettlementAccount(params.account);
        break;

      case "updateSettlementAccount":
        result = await client.updateSettlementAccount(params.accountId, params.updates);
        break;

      case "deleteSettlementAccount":
        result = await client.deleteSettlementAccount(params.accountId);
        break;

      case "getSettlementMode":
        result = await client.getSettlementMode();
        break;

      case "setSettlementMode":
        result = await client.setSettlementMode(params.mode);
        break;

      // Collections
      case "createInvoiceCollection":
        result = await client.createInvoiceCollection(params.data || params);
        break;

      case "createBankCollection":
        result = await client.createBankCollection(params.data || params);
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
    console.error("iSmart finance error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
