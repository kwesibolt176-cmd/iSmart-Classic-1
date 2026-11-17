import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  MerchantApiError,
  MerchantSessionResponse,
  merchantApiUrl,
  merchantRequest,
  toErrorResponse,
} from "../_shared/merchant-api-client.ts";
import { getMerchantSession, merchantRequestWithSessionRefresh, requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";
import { encryptSessionToken, sessionEncryptionSecret } from "../_shared/session-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const googleAuthEnabled = Deno.env.get("GOOGLE_AUTH_ENABLED") === "true";

type AuthBody = {
  action: "login" | "register" | "verify-2fa" | "request-phone-login" | "verify-phone-login" |
    "google-start" | "google-exchange" | "google-id-token" |
    "request-password-reset" | "confirm-password-reset" | "reset-password" | "session" | "logout";
  email?: string;
  phone?: string;
  password?: string;
  fullName?: string;
  preauthToken?: string;
  code?: string;
  resetToken?: string;
  newPassword?: string;
  business?: Record<string, unknown>;
  returnTo?: string;
  googleCode?: string;
  idToken?: string;
};

// BusinessCreate.businessType enum from the Merchant API contract.
const LEGAL_FORMS = new Set([
  "sole_proprietorship",
  "subsidiary_business_name",
  "incorporated_private_partnership",
  "company_limited_by_shares",
  "company_limited_by_guarantee",
  "company_unlimited_by_shares",
  "external_company",
  "professional_body",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const createPortalSession = async (merchantSession: MerchantSessionResponse, fallbackEmail?: string) => {
  if (!merchantSession?.tokens?.access_token || !merchantSession.tokens.refresh_token) {
    throw new MerchantApiError(502, "invalid_upstream_response", "The merchant session was incomplete.");
  }
  const principal = merchantSession.principal;
  // Supabase Auth requires an email-shaped identifier. Phone-only Merchant
  // principals receive a deterministic, non-routable internal identifier.
  const email = principal.email || fallbackEmail || `${principal.id}@phone.merchant.local`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      data: {
        synced_from_merchant_api: true,
        merchant_principal_id: principal.id,
        full_name: principal.full_name,
      },
    },
  });
  if (linkError || !link.user || !link.properties?.hashed_token) {
    throw new MerchantApiError(502, "portal_session_failed", "We could not create your portal session. Please try again.");
  }

  const encryptionSecret = sessionEncryptionSecret();
  const { error: sessionError } = await supabase.from("merchant_api_sessions").upsert({
    user_id: link.user.id,
    merchant_principal_id: principal.id,
    business_id: principal.business_id || null,
    access_token: await encryptSessionToken(merchantSession.tokens.access_token, encryptionSecret),
    refresh_token: await encryptSessionToken(merchantSession.tokens.refresh_token, encryptionSecret),
    access_expires_at: merchantSession.tokens.expires_at || null,
    merchant_session_id: merchantSession.tokens.session_id || null,
    updated_at: new Date().toISOString(),
  });
  if (sessionError) {
    throw new MerchantApiError(503, "portal_session_store_unavailable", "The sign-in service is temporarily unavailable. Please try again.");
  }
  if (principal.business_id) {
    await supabase.from("business_profiles").update({
      merchant_business_id: principal.business_id,
      ismart_business_id: principal.business_id,
    }).eq("user_id", link.user.id);
  }
  return {
    success: true,
    tokenHash: link.properties.hashed_token,
    email,
    principal: {
      id: principal.id,
      businessId: principal.business_id,
      fullName: principal.full_name,
      role: principal.role,
    },
  };
};

const loginWithPassword = async (email?: string, phone?: string, password?: string) => {
  try {
    return await merchantRequest<MerchantSessionResponse | Record<string, unknown>>(
      "/v1/business/auth/login",
      { method: "POST", body: { email, phone, password } },
    );
  } catch (error) {
    // identity-core currently returns an implementation-level bearer rejection
    // for invalid credentials. Do not expose that internal detail to merchants.
    if (error instanceof MerchantApiError && error.status === 401) {
      throw new MerchantApiError(401, "invalid_credentials", "Invalid email or password.");
    }
    throw error;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "method_not_allowed", message: "method not allowed" } }, 405);

  try {
    const input = (await req.json()) as AuthBody;
    if (!input.action) return json({ error: { code: "invalid_input", message: "action is required" } }, 400);
    if (["google-start", "google-exchange", "google-id-token"].includes(input.action) && !googleAuthEnabled) {
      return json({ error: { code: "google_auth_disabled", message: "Google authentication is temporarily unavailable." } }, 503);
    }

    if (input.action === "session" || input.action === "logout") {
      const supabase = serviceClient();
      const user = await requirePortalUser(req, supabase);
      let session;
      try {
        session = await getMerchantSession(supabase, user.id);
      } catch (error) {
        if (input.action === "logout" && error instanceof MerchantApiError && error.code === "merchant_session_missing") {
          return json({ success: true });
        }
        throw error;
      }
      if (input.action === "logout") {
        try {
          await merchantRequest("/v1/auth/logout", { method: "POST", accessToken: session.access_token });
        } catch (error) {
          if (!(error instanceof MerchantApiError) || ![401, 403].includes(error.status)) throw error;
        } finally {
          await supabase.from("merchant_api_sessions").delete().eq("user_id", user.id);
        }
        return json({ success: true });
      }
      let principal: Record<string, unknown>;
      try {
        principal = await merchantRequestWithSessionRefresh(supabase, session, (accessToken) =>
          merchantRequest<Record<string, unknown>>("/v1/auth/me", { accessToken }),
        );
      } catch (error) {
        if (error instanceof MerchantApiError && error.status === 404) {
          await supabase.from("merchant_api_sessions").delete().eq("user_id", user.id);
          throw new MerchantApiError(401, "merchant_session_expired", "Your iSmart account session is no longer available. Please sign in again.");
        }
        throw error;
      }
      const principalBusinessId = String(principal.business_id || principal.businessId || "");
      if (session.business_id && principalBusinessId && principalBusinessId !== session.business_id) {
        await supabase.from("merchant_api_sessions").delete().eq("user_id", user.id);
        throw new MerchantApiError(401, "merchant_session_mismatch", "Your iSmart session no longer matches this business. Please sign in again.");
      }
      return json({ success: true, businessId: session.business_id, principalId: session.merchant_principal_id });
    }

    if (input.action === "request-password-reset") {
      if (!input.email && !input.phone) return json({ error: { code: "invalid_input", message: "email or phone is required" } }, 400);
      return json(await merchantRequest("/v1/business/auth/password/request-reset", {
        method: "POST", body: { email: input.email, phone: input.phone },
      }));
    }
    if (input.action === "confirm-password-reset") {
      if (!input.code || (!input.email && !input.phone)) return json({ error: { code: "invalid_input", message: "code and email or phone are required" } }, 400);
      return json(await merchantRequest("/v1/business/auth/password/confirm-otp", {
        method: "POST", body: { email: input.email, phone: input.phone, code: input.code },
      }));
    }
    if (input.action === "reset-password") {
      if (!input.resetToken || !input.newPassword) return json({ error: { code: "invalid_input", message: "reset token and new password are required" } }, 400);
      return json(await merchantRequest("/v1/auth/password/reset", {
        method: "POST", body: { reset_token: input.resetToken, new_password: input.newPassword },
      }));
    }
    if (input.action === "request-phone-login") {
      if (!input.phone) return json({ error: { code: "invalid_input", message: "phone is required" } }, 400);
      return json(await merchantRequest("/v1/business/auth/login/otp/request", {
        method: "POST", body: { phone: input.phone },
      }));
    }
    if (input.action === "google-start") {
      if (!input.returnTo) return json({ error: { code: "invalid_input", message: "return URL is required" } }, 400);
      const returnUrl = new URL(input.returnTo);
      const requestOrigin = req.headers.get("Origin");
      const isLocal = ["localhost", "127.0.0.1"].includes(returnUrl.hostname);
      if (!isLocal && (!requestOrigin || returnUrl.origin !== requestOrigin)) {
        return json({ error: { code: "invalid_return_url", message: "return URL is not allowed" } }, 400);
      }
      const start = merchantApiUrl("/v1/business/auth/google/start");
      start.searchParams.set("return_to", returnUrl.toString());
      return json({ success: true, url: start.toString() });
    }

    let merchantSession: MerchantSessionResponse | null = null;
    if (input.action === "login") {
      if (!input.password || (!input.email && !input.phone)) {
        return json({ error: { code: "invalid_input", message: "email or phone and password are required" } }, 400);
      }
      const result = await loginWithPassword(input.email, input.phone, input.password);
      if ((result as { two_factor_required?: boolean }).two_factor_required) return json(result);
      merchantSession = result as MerchantSessionResponse;
    } else if (input.action === "verify-2fa") {
      if (!input.preauthToken || !input.code) {
        return json({ error: { code: "invalid_input", message: "preauth token and code are required" } }, 400);
      }
      merchantSession = await merchantRequest<MerchantSessionResponse>("/v1/business/auth/verify-2fa", {
        method: "POST",
        body: { preauth_token: input.preauthToken, code: input.code },
      });
    } else if (input.action === "verify-phone-login") {
      if (!input.phone || !input.code) {
        return json({ error: { code: "invalid_input", message: "phone and code are required" } }, 400);
      }
      merchantSession = await merchantRequest<MerchantSessionResponse>("/v1/business/auth/login/otp/verify", {
        method: "POST", body: { phone: input.phone, code: input.code },
      });
    } else if (input.action === "google-exchange") {
      if (!input.googleCode) return json({ error: { code: "invalid_input", message: "Google sign-in code is required" } }, 400);
      merchantSession = await merchantRequest<MerchantSessionResponse>("/v1/business/auth/google/exchange", {
        method: "POST", body: { code: input.googleCode },
      });
    } else if (input.action === "google-id-token") {
      if (!input.idToken) return json({ error: { code: "invalid_input", message: "Google ID token is required" } }, 400);
      merchantSession = await merchantRequest<MerchantSessionResponse>("/v1/business/auth/google", {
        method: "POST", body: { id_token: input.idToken },
      });
    } else {
      if (!input.password || (!input.email && !input.phone)) {
        return json({ error: { code: "invalid_input", message: "email or phone and password are required" } }, 400);
      }
      // Reject a business the Merchant API will refuse before creating the
      // login account, so a bad legal form cannot leave an account without a business.
      if (input.business && !LEGAL_FORMS.has(String(input.business.businessType ?? ""))) {
        return json({ error: { code: "invalid_input", message: "Choose your business's registered legal form." } }, 400);
      }
      let accountAlreadyExisted = false;
      try {
        await merchantRequest("/v1/business/auth/register", {
          method: "POST",
          body: {
            email: input.email,
            phone: input.phone,
            password: input.password,
            full_name: input.fullName,
          },
        });
      } catch (error) {
        const duplicate = error instanceof MerchantApiError &&
          (error.status === 409 || error.code.includes("exists") || error.message.toLowerCase().includes("already"));
        if (!duplicate) throw error;
        // Registration may have succeeded before a later portal step failed.
        // Logging in below makes the operation safely retryable with the same credentials.
        accountAlreadyExisted = true;
      }
      let loginResult: Awaited<ReturnType<typeof loginWithPassword>>;
      try {
        loginResult = await loginWithPassword(input.email, input.phone, input.password);
      } catch (error) {
        // The account exists but these credentials do not open it: tell the
        // merchant to sign in or reset, rather than reporting a bad password
        // on a sign-up form.
        if (accountAlreadyExisted && error instanceof MerchantApiError && error.code === "invalid_credentials") {
          throw new MerchantApiError(
            409,
            "account_exists",
            "An account with this email or phone number already exists. Please sign in or reset your password.",
          );
        }
        throw error;
      }
      if ((loginResult as { two_factor_required?: boolean }).two_factor_required) return json(loginResult);
      merchantSession = loginResult as MerchantSessionResponse;
      if (input.business) {
        const business = await merchantRequest<{ id: string }>("/v1/businesses", {
          method: "POST",
          accessToken: merchantSession.tokens.access_token,
          body: input.business,
        });
        merchantSession.principal.business_id = business.id;
      }
    }

    return json(await createPortalSession(merchantSession, input.email));
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});
