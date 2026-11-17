import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  MerchantApiError,
  merchantRequest,
  refreshMerchantSession,
  toErrorResponse,
} from "../_shared/merchant-api-client.ts";
import { getMerchantSession } from "../_shared/merchant-session.ts";
import { encryptSessionToken, sessionEncryptionSecret } from "../_shared/session-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Operation = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  public?: boolean;
  idempotent?: boolean;
};

const operations: Record<string, Operation> = {
  authMe: { method: "GET", path: "/v1/auth/me" },
  authLogout: { method: "POST", path: "/v1/auth/logout" },
  authChangePassword: { method: "POST", path: "/v1/auth/password/change" },
  authChangeEmail: { method: "POST", path: "/v1/auth/email" },
  authRequestEmailVerification: { method: "POST", path: "/v1/auth/email/request-verification" },
  authConfirmEmailVerification: { method: "POST", path: "/v1/auth/email/verify" },
  authChangePhone: { method: "POST", path: "/v1/auth/phone" },
  authRequestPhoneVerification: { method: "POST", path: "/v1/auth/phone/request-verification" },
  authConfirmPhoneVerification: { method: "POST", path: "/v1/auth/phone/verify" },
  authPinStatus: { method: "GET", path: "/v1/auth/pin" },
  authSetPin: { method: "POST", path: "/v1/auth/pin" },
  authTwoFactorStatus: { method: "GET", path: "/v1/auth/2fa/status" },
  authBeginTwoFactorSetup: { method: "POST", path: "/v1/auth/2fa/setup" },
  authConfirmTwoFactorSetup: { method: "POST", path: "/v1/auth/2fa/confirm" },
  authDisableTwoFactor: { method: "POST", path: "/v1/auth/2fa/disable" },

  createBusiness: { method: "POST", path: "/v1/businesses" },
  getBusiness: { method: "GET", path: "/v1/businesses/{id}" },
  updateBusiness: { method: "PUT", path: "/v1/businesses/{id}" },
  getBusinessAccess: { method: "GET", path: "/v1/businesses/{id}/access" },
  updateBusinessContactInfo: { method: "PUT", path: "/v1/businesses/{id}/contact-info" },
  getBusinessHandle: { method: "GET", path: "/v1/businesses/{id}/handle" },
  claimBusinessHandle: { method: "PUT", path: "/v1/businesses/{id}/handle" },
  releaseBusinessHandle: { method: "DELETE", path: "/v1/businesses/{id}/handle" },
  getBusinessLogo: { method: "GET", path: "/v1/businesses/{id}/logo" },
  getBusinessLogoContent: { method: "GET", path: "/v1/businesses/{id}/logo/content" },

  myDocuments: { method: "GET", path: "/v1/compliance/documents" },
  submitDocument: { method: "POST", path: "/v1/compliance/documents" },
  confirmDocument: { method: "POST", path: "/v1/compliance/documents/{id}/confirm" },
  submitRiskDocument: { method: "POST", path: "/v1/compliance/risk-documents" },
  recordValidatedPhone: { method: "POST", path: "/v1/compliance/phones/validated" },
  myVerificationLevel: { method: "GET", path: "/v1/compliance/verification-level" },
  verificationLevels: { method: "GET", path: "/v1/verification-levels" },

  listBusinessOwners: { method: "GET", path: "/v1/businesses/{id}/owners" },
  createBusinessOwner: { method: "POST", path: "/v1/businesses/{id}/owners" },
  updateBusinessOwner: { method: "PUT", path: "/v1/businesses/{id}/owners/{ownerId}" },
  deleteBusinessOwner: { method: "DELETE", path: "/v1/businesses/{id}/owners/{ownerId}" },
  confirmBusinessOwnerPep: { method: "PUT", path: "/v1/businesses/{id}/owners/{ownerId}/pep" },

  listTeams: { method: "GET", path: "/v1/businesses/{id}/teams" },
  createTeam: { method: "POST", path: "/v1/businesses/{id}/teams" },
  renameTeam: { method: "PATCH", path: "/v1/businesses/{id}/teams/{teamId}" },
  deleteTeam: { method: "DELETE", path: "/v1/businesses/{id}/teams/{teamId}" },
  listBusinessMembers: { method: "GET", path: "/v1/businesses/{id}/members" },
  listTeamMembers: { method: "GET", path: "/v1/businesses/{id}/teams/{teamId}/members" },
  removeMember: { method: "DELETE", path: "/v1/businesses/{id}/teams/{teamId}/members/{memberId}" },
  listTeamInvites: { method: "GET", path: "/v1/businesses/{id}/teams/{teamId}/invites" },
  createInvite: { method: "POST", path: "/v1/businesses/{id}/teams/{teamId}/members/invite" },
  resendInvite: { method: "POST", path: "/v1/businesses/{id}/invites/{inviteId}/resend" },
  revokeInvite: { method: "POST", path: "/v1/businesses/{id}/invites/{inviteId}/revoke" },
  linkInvite: { method: "POST", path: "/v1/businesses/{id}/invites/{inviteId}/link" },
  previewInvite: { method: "POST", path: "/v1/invites/preview", public: true },
  acceptInvite: { method: "POST", path: "/v1/invites/accept", public: true },

  listBanks: { method: "GET", path: "/v1/businesses/{id}/banks" },
  listBusinessAccounts: { method: "GET", path: "/v1/businesses/{id}/accounts" },
  createBusinessAccount: { method: "POST", path: "/v1/businesses/{id}/accounts" },
  updateBusinessAccount: { method: "PUT", path: "/v1/businesses/{id}/accounts/{accountId}" },
  deleteBusinessAccount: { method: "DELETE", path: "/v1/businesses/{id}/accounts/{accountId}" },
  lookupBusinessAccount: { method: "POST", path: "/v1/businesses/{id}/accounts/{accountId}/lookups" },
  confirmBusinessAccount: { method: "POST", path: "/v1/businesses/{id}/accounts/{accountId}/verification" },

  provisionBusinessWallet: { method: "POST", path: "/v1/businesses/{id}/wallet", idempotent: true },
  listWalletPaymentMethods: { method: "GET", path: "/v1/businesses/{id}/wallet/payment-methods" },
  getWalletLimits: { method: "GET", path: "/v1/businesses/{id}/wallet/limits" },
  lookupWalletParty: { method: "GET", path: "/v1/businesses/{id}/wallet/party-lookups" },
  listWalletTransactions: { method: "GET", path: "/v1/businesses/{id}/wallet/transactions" },
  createWalletCollection: { method: "POST", path: "/v1/businesses/{id}/wallet/collections", idempotent: true },
  getWalletCollection: { method: "GET", path: "/v1/businesses/{id}/wallet/collections/{reference}" },
  createWalletPayout: { method: "POST", path: "/v1/businesses/{id}/wallet/payouts", idempotent: true },
  getWalletPayout: { method: "GET", path: "/v1/businesses/{id}/wallet/payouts/{reference}" },
  getWalletRecipient: { method: "GET", path: "/v1/businesses/{id}/wallet/recipients/{handle}" },
  createWalletTransfer: { method: "POST", path: "/v1/businesses/{id}/wallet/transfers", idempotent: true },
  getWalletTransfer: { method: "GET", path: "/v1/businesses/{id}/wallet/transfers/{reference}" },
  listUtilityProducts: { method: "GET", path: "/v1/businesses/{id}/wallet/utility-products" },
  createUtilityPurchase: { method: "POST", path: "/v1/businesses/{id}/wallet/utility-purchases", idempotent: true },
  getUtilityPurchase: { method: "GET", path: "/v1/businesses/{id}/wallet/utility-purchases/{reference}" },
  quoteCollectionFee: { method: "GET", path: "/v1/businesses/{id}/wallet/fee-quotes/collections" },
  quotePayoutFee: { method: "GET", path: "/v1/businesses/{id}/wallet/fee-quotes/payouts" },
  quoteUtilityFee: { method: "GET", path: "/v1/businesses/{id}/wallet/fee-quotes/utilities" },
  requestPayoutReversal: { method: "POST", path: "/v1/businesses/{id}/wallet/payouts/{reference}/reversal-requests", idempotent: true },
  requestTransferReversal: { method: "POST", path: "/v1/businesses/{id}/wallet/transfers/{reference}/reversal-requests", idempotent: true },
  getReversalRequest: { method: "GET", path: "/v1/businesses/{id}/wallet/reversal-requests/{reference}" },

  getCheckoutSettings: { method: "GET", path: "/v1/businesses/{id}/checkout-settings" },
  enableCheckout: { method: "POST", path: "/v1/businesses/{id}/checkout-settings/enable", idempotent: true },
  disableCheckout: { method: "POST", path: "/v1/businesses/{id}/checkout-settings/disable" },
  listCheckouts: { method: "GET", path: "/v1/businesses/{id}/checkouts" },
  createCheckout: { method: "POST", path: "/v1/businesses/{id}/checkouts", idempotent: true },
  getCheckout: { method: "GET", path: "/v1/businesses/{id}/checkouts/{checkoutId}" },
  cancelCheckout: { method: "POST", path: "/v1/businesses/{id}/checkouts/{checkoutId}/cancel" },
  getPublicCheckout: { method: "GET", path: "/v1/public/checkouts/{token}", public: true },
  payPublicCheckout: { method: "POST", path: "/v1/public/checkouts/{token}/pay", public: true, idempotent: true },
  getPublicCheckoutStatus: { method: "GET", path: "/v1/public/checkouts/{token}/status", public: true },

  getInvoiceSettings: { method: "GET", path: "/v1/businesses/{id}/invoice-settings" },
  updateInvoiceSettings: { method: "PUT", path: "/v1/businesses/{id}/invoice-settings" },
  listInvoices: { method: "GET", path: "/v1/businesses/{id}/invoices" },
  createInvoice: { method: "POST", path: "/v1/businesses/{id}/invoices" },
  getInvoice: { method: "GET", path: "/v1/businesses/{id}/invoices/{invoiceId}" },
  updateInvoice: { method: "PUT", path: "/v1/businesses/{id}/invoices/{invoiceId}" },
  deleteInvoice: { method: "DELETE", path: "/v1/businesses/{id}/invoices/{invoiceId}" },
  issueInvoice: { method: "POST", path: "/v1/businesses/{id}/invoices/{invoiceId}/issue" },
  sendInvoice: { method: "POST", path: "/v1/businesses/{id}/invoices/{invoiceId}/send" },
  voidInvoice: { method: "POST", path: "/v1/businesses/{id}/invoices/{invoiceId}/void" },
  replaceInvoicePaymentLink: { method: "POST", path: "/v1/businesses/{id}/invoices/{invoiceId}/payment-link" },

  getSettlement: { method: "GET", path: "/v1/businesses/{id}/settlement" },
  putSettlement: { method: "PUT", path: "/v1/businesses/{id}/settlement", idempotent: true },
  deleteSettlement: { method: "DELETE", path: "/v1/businesses/{id}/settlement", idempotent: true },
  listSettlementRuns: { method: "GET", path: "/v1/businesses/{id}/settlement/runs" },
  latestSettlementRun: { method: "GET", path: "/v1/businesses/{id}/settlement/runs/latest" },
  getSettlementRun: { method: "GET", path: "/v1/businesses/{id}/settlement/runs/{runId}" },
  settleNow: { method: "POST", path: "/v1/businesses/{id}/settlement/runs", idempotent: true },
  retrySettlementRun: { method: "POST", path: "/v1/businesses/{id}/settlement/runs/{runId}/resettlements", idempotent: true },

  getRiskMatrix: { method: "GET", path: "/v1/risk-matrix" },
  listRiskRatings: { method: "GET", path: "/v1/risk-ratings" },
  getRiskRegister: { method: "GET", path: "/v1/risk-reports/register" },
  getRiskSummary: { method: "GET", path: "/v1/risk-reports/summary" },
  getBusinessRiskProfile: { method: "GET", path: "/v1/businesses/{id}/risk-profile" },
  updateBusinessRiskProfile: { method: "PATCH", path: "/v1/businesses/{id}/risk-profile" },
  getBusinessRiskRating: { method: "GET", path: "/v1/businesses/{id}/risk-rating" },
  recomputeBusinessRiskRating: { method: "POST", path: "/v1/businesses/{id}/risk-rating/recompute" },
  setBusinessRiskOverride: { method: "PUT", path: "/v1/businesses/{id}/risk-rating/override" },
  clearBusinessRiskOverride: { method: "DELETE", path: "/v1/businesses/{id}/risk-rating/override" },
  listBusinessRiskRatings: { method: "GET", path: "/v1/businesses/{id}/risk-ratings" },
  listRiskRatingChanges: { method: "GET", path: "/v1/risk-reports/changes" },

  transactionSummary: { method: "GET", path: "/v1/businesses/{id}/reports/transactions/summary" },
  createTransactionExport: { method: "POST", path: "/v1/businesses/{id}/reports/transactions/exports" },
};

const interpolatePath = (template: string, values: Record<string, string>) =>
  template.replace(/\{([A-Za-z]+)\}/g, (_, key: string) => {
    const value = values[key];
    if (!value) throw new MerchantApiError(400, "invalid_input", `missing path parameter: ${key}`);
    return encodeURIComponent(value);
  });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "method_not_allowed", message: "method not allowed" } }, 405);

  try {
    const input = await req.json() as {
      operation: string;
      path?: Record<string, string>;
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      idempotencyKey?: string;
    };
    const operation = operations[input.operation];
    if (!operation) throw new MerchantApiError(400, "invalid_operation", "unsupported Merchant API operation");
    if (operation.idempotent && !input.idempotencyKey) {
      throw new MerchantApiError(400, "idempotency_key_required", "idempotency key is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    let accessToken: string | undefined;
    let session: { user_id: string; business_id: string | null; access_token: string; refresh_token: string } | null = null;
    if (!operation.public) {
      const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!bearer) throw new MerchantApiError(401, "unauthenticated", "authentication required");
      const { data: authData, error: authError } = await supabase.auth.getUser(bearer);
      if (authError || !authData.user) throw new MerchantApiError(401, "unauthenticated", "authentication required");
      session = await getMerchantSession(supabase, authData.user.id);
      accessToken = session.access_token;
      if (operation.path.includes("{id}")) {
        if (!session.business_id || input.path?.id !== session.business_id) {
          throw new MerchantApiError(403, "forbidden", "business access is not permitted");
        }
      }
    }

    const execute = (token?: string) => merchantRequest(interpolatePath(operation.path, input.path || {}), {
      method: operation.method,
      accessToken: token,
      body: input.body,
      query: input.query,
      idempotencyKey: input.idempotencyKey,
    });

    try {
      return json(await execute(accessToken));
    } catch (error) {
      if (!(error instanceof MerchantApiError) || error.status !== 401 || !session) throw error;
      let refreshed;
      try {
        refreshed = await refreshMerchantSession(session.refresh_token);
      } catch (refreshError) {
        if (refreshError instanceof MerchantApiError && [400, 401, 403].includes(refreshError.status)) {
          await supabase.from("merchant_api_sessions").delete().eq("user_id", session.user_id);
          throw new MerchantApiError(401, "merchant_session_expired", "Your iSmart session has expired. Please sign in again.");
        }
        throw refreshError;
      }
      const encryptionSecret = sessionEncryptionSecret();
      const { error: updateError } = await supabase.from("merchant_api_sessions").update({
        access_token: await encryptSessionToken(refreshed.tokens.access_token, encryptionSecret),
        refresh_token: await encryptSessionToken(refreshed.tokens.refresh_token, encryptionSecret),
        access_expires_at: refreshed.tokens.expires_at || null,
        merchant_session_id: refreshed.tokens.session_id || null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", session.user_id);
      if (updateError) throw new MerchantApiError(503, "merchant_session_store_unavailable", "The sign-in service is temporarily unavailable.");
      return json(await execute(refreshed.tokens.access_token));
    }
  } catch (error) {
    return toErrorResponse(error, corsHeaders);
  }
});
