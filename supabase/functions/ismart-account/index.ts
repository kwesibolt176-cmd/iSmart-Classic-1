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
      // Profile & Preferences
      case "getProfile":
        result = await client.getProfile();
        break;

      case "getPersonalInfo":
        result = await client.getPersonalInfo();
        break;

      case "updatePersonalInfo":
        result = await client.updatePersonalInfo(params);
        break;

      case "getPreferences":
        result = await client.getPreferences();
        break;

      case "updatePreferences":
        result = await client.updatePreferences(params);
        break;

      case "getSecurityInfo":
        result = await client.getSecurityInfo();
        break;

      case "addContactPerson":
        result = await client.addContactPerson(params);
        break;

      // PIN
      case "setPin":
        result = await client.setPin({ pin: params.pin, confirmPin: params.confirmPin });
        break;

      case "verifyPin":
        result = await client.verifyPin({ pin: params.pin });
        break;

      // 2FA
      case "enable2FA":
        result = await client.enable2FA();
        break;

      case "disable2FA":
        result = await client.disable2FA();
        break;

      // API Credentials
      case "getAPICredentials":
        result = await client.getAPICredentials();
        break;

      case "deleteAPICredential":
        result = await client.deleteAPICredential(params.credentialId);
        break;

      // Messages / Notifications
      case "getMessages":
        result = await client.getMessages();
        break;

      case "markMessageRead":
        result = await client.markMessageRead(params.messageId);
        break;

      case "deleteMessage":
        result = await client.deleteMessage(params.messageId);
        break;

      case "deleteAllMessages":
        result = await client.deleteAllMessages();
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

      // Reports & Dashboard
      case "getReport":
        result = await client.getReport(params);
        break;

      case "getDashboardMetrics":
        result = await client.getDashboardMetrics();
        break;

      // Verification / KYC
      case "getVerificationLevel":
        result = await client.getVerificationLevel();
        break;

      case "uploadKYCDocs":
        result = await client.uploadKYCDocs(params);
        break;

      case "getKYCDocs":
        result = await client.getKYCDocs();
        break;

      // Logo
      case "addLogo":
        result = await client.addLogo(params);
        break;

      case "getLogoUrl":
        result = await client.getLogoUrl(params.businessId);
        break;

      // Wallet (legacy)
      case "addFunds":
        result = await client.addFunds(params);
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
    console.error("iSmart account error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAuth = /unauthorized|401|invalid token|expired/i.test(errorMessage);
    const isCustomerNotFound = /customer not found/i.test(errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        fallback: isCustomerNotFound,
        error: isAuth
          ? "iSmart session expired. Please login again."
          : isCustomerNotFound
            ? "This iSmart account could not be found. Please sign out and sign in again."
            : errorMessage,
        code: isAuth ? "ISMART_UNAUTHORIZED" : isCustomerNotFound ? "ISMART_CUSTOMER_NOT_FOUND" : "ISMART_ACCOUNT_FAILED",
      }),
      // Always 200 so the browser client can read the error code/message
      // (supabase.functions.invoke discards bodies on non-2xx responses).
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
