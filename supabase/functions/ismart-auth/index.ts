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

    if (action === "checkEmailPhoneVerified") {
      console.log("[CHECK EMAIL/PHONE VERIFIED] request received");
    }

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
      // Public Auth
      case "login":
        result = await client.login({ email: params.email, password: params.password });
        // NOTE: Do NOT write tokens to system_settings — that table is global
        // and would leak one user's iSmart identity to all other users.
        // Tokens are stored per-user in the browser (localStorage) and passed
        // back via ismartAccessToken / ismartUserId on each request.
        break;

      case "register":
        result = await client.register({
          first_name: params.first_name,
          last_name: params.last_name,
          email: params.email,
          phone_number: params.phone_number,
          password: params.password,
          business_name: params.business_name,
        });
        break;

      case "registerBusiness": {
        const fullName = String(
          params.full_name || `${params.first_name || ""} ${params.last_name || ""}`
        ).trim();
        const businessType = params.business_type === "registered" ? "registered" : "starter";
        const businessName = String(params.business_name || "").trim();
        const email = String(params.email || "").trim().toLowerCase();
        const password = String(params.password || "");
        // iSmart requires 233XXXXXXXXX (12 digits, no plus sign)
        let phone = String(params.phone || params.phone_number || "").replace(/\D/g, "");
        if (phone.startsWith("00")) phone = phone.slice(2);
        if (phone.startsWith("0")) phone = `233${phone.slice(1)}`;
        if (phone.length === 9) phone = `233${phone}`;

        const errors: string[] = [];
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid email is required");
        if (
          password.length < 8 ||
          !/[A-Z]/.test(password) ||
          !/[a-z]/.test(password) ||
          !/\d/.test(password) ||
          !/[^A-Za-z0-9]/.test(password)
        ) {
          errors.push(
            "Password must be at least 8 characters with an uppercase letter, lowercase letter, number and special character"
          );
        }
        if (!fullName || fullName.length > 100) errors.push("Contact full name is required (max 100 characters)");
        if (!/^233\d{9}$/.test(phone)) errors.push("Phone must be in the format 233XXXXXXXXX");
        if (!businessName || businessName.length > 100) errors.push("Business name is required (max 100 characters)");
        if (!String(params.category || "").trim()) errors.push("Business category is required");
        if (!String(params.industry || "").trim()) errors.push("Business industry is required");

        if (errors.length > 0) {
          return new Response(
            JSON.stringify({ success: false, error: errors.join(". "), code: "ISMART_VALIDATION" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = await client.registerBusiness({
          full_name: fullName,
          email,
          phone,
          password,
          business_name: businessName,
          business_type: businessType,
          country: String(params.country || "Ghana").trim(),
          category: String(params.category).trim(),
          industry: String(params.industry).trim(),
        });
        break;
      }


      case "requestPasswordReset":
        result = await client.requestPasswordReset({ email: params.email });
        break;

      case "resetPassword":
        result = await client.resetPassword(params.email, params.token, params.newPassword);
        break;

      case "getAllServices":
        result = await client.getAllServices();
        break;

      case "searchUser":
        result = await client.searchUser(params);
        break;

      // Password Reset OTP flow
      case "requestPasswordResetOTP":
        result = await client.requestPasswordResetOTP(params.email);
        break;

      case "confirmPasswordResetOTP":
        result = await client.confirmPasswordResetOTP(params.otp, params.userId);
        break;

      case "resetPasswordWithOTP":
        if (!params.userId) {
          return new Response(
            JSON.stringify({ success: false, error: "Reset session expired. Please request a new code.", code: "ISMART_RESET_NO_USER" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await client.resetPasswordWithOTP({
          email: params.email,
          userId: params.userId,
          otp: params.otp,
          newPassword: params.newPassword,
        });
        break;

      // Token
      case "refreshToken":
        result = await client.refreshToken(params.refreshToken);
        // Per-user token only — do not persist globally.
        break;

      case "logout":
        result = await client.logout();
        // Per-user token only — nothing global to clear.
        break;

      // Email / Phone Verification
      case "requestVerifyEmail":
        result = await client.requestVerifyEmail();
        break;

      case "verifyEmail":
        result = await client.verifyEmail({ email: params.email, otp: params.otp });
        break;

      case "verifyLoggedInEmail":
        result = await client.verifyLoggedInEmail({ otp: params.otp });
        break;

      case "requestVerifyPhoneOTPPublic":
        result = await client.requestVerifyPhoneOTPPublic(params.type);
        break;

      case "requestVerifyPhoneOTP":
        result = await client.requestVerifyPhoneOTP(params.endpointType);
        break;

      case "verifyPhone":
        result = await client.verifyPhone(params.otp);
        break;

      case "checkEmailPhoneVerified":
        result = await client.checkEmailPhoneVerified();
        console.log("[CHECK EMAIL/PHONE VERIFIED] iSmart account status response:", JSON.stringify(result));
        break;

      // Password (authenticated)
      case "changePassword":
        result = await client.changePassword({
          oldPassword: params.oldPassword || params.currentPassword,
          newPassword: params.newPassword,
        });
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
    console.error("iSmart auth error:", error);
    console.error("[CHECK EMAIL/PHONE VERIFIED] request failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Bad credentials / user errors are NOT server errors — surface a clear
    // message with a 200 so the browser client can read the body.
    const isBadCredentials = /invalid credentials|incorrect password|wrong password|user not found|invalid email/i.test(errorMessage);
    const isSessionExpired = /unauthorized|invalid token|token expired|401/i.test(errorMessage);

    if (isBadCredentials || isSessionExpired) {
      return new Response(
        JSON.stringify({
          success: false,
          error: isBadCredentials
            ? "Invalid email or password. Please try again."
            : "Your session expired. Please sign in again.",
          code: isBadCredentials ? "INVALID_CREDENTIALS" : "ISMART_UNAUTHORIZED",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage, code: "ISMART_AUTH_FAILED" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
