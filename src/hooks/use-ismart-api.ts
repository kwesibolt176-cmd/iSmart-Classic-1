// iSmart API React Hook - Centralized API calls for all iSmart integrations
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";
import { callMerchantApi, createIdempotencyKey } from "@/lib/merchant-api";

const businessId = () => localStorage.getItem("ismart_business_id") || undefined;
const utilityQueryActions = new Set([
  "queryElectricity", "queryWater", "queryMTNData", "queryTelecelData", "queryATData",
  "queryMTNBroadband", "queryTelecelBroadband", "queryDStv", "queryGOtv", "queryStarTimes",
]);
const utilityPurchaseActions = new Set([
  "buyElectricity", "buyWater", "buyMTNData", "buyTelecelData", "buyATData",
  "buyMTNAirtime", "buyTelecelAirtime", "buyATAirtime", "buyMTNBroadband",
  "buyTelecelBroadband", "buyDStv", "buyGOtv", "buyStarTimes",
]);

const utilityTerms = (action: string) => {
  const value = action.toLowerCase();
  const network = value.includes("telecel") ? "telecel" : value.includes("mtn") ? "mtn" : value.includes("atdata") || value.includes("atairtime") ? "at" : value.includes("dstv") ? "dstv" : value.includes("gotv") ? "gotv" : value.includes("startimes") ? "startimes" : "";
  const category = value.includes("airtime") ? "airtime" : value.includes("data") ? "data" : value.includes("broadband") ? "broadband" : value.includes("electricity") ? "electricity" : value.includes("water") ? "water" : value.includes("dstv") || value.includes("gotv") || value.includes("startimes") ? "tv" : "";
  return { network, category };
};

const compatibilityCall = async <T>(action: string, params: Record<string, unknown>) => {
  const id = (params.businessId as string | undefined) || businessId();
  const path = id ? { id } : undefined;
  const data = (params.data || params) as Record<string, unknown>;
  if (utilityQueryActions.has(action) || utilityPurchaseActions.has(action)) {
    if (!id) throw new Error("Merchant business is not linked");
    const catalog = await callMerchantApi<{ items: Array<Record<string, unknown>> }>("listUtilityProducts", { path: { id } });
    const terms = utilityTerms(action);
    const products = (catalog.items || []).filter((product) => {
      const category = String(product.category || "").toLowerCase();
      const network = String(product.network || "").toLowerCase();
      return (!terms.category || category.includes(terms.category)) && (!terms.network || network.includes(terms.network));
    });
    if (utilityQueryActions.has(action)) {
      return { bundles: products.map((product) => ({
        id: product.id,
        code: product.id,
        name: product.name,
        amount: product.price,
        min: product.min,
        max: product.max,
      })) } as T;
    }
    const requestedProduct = String(data.BundleValue || data.ProductCode || "");
    const product = products.find((item) => String(item.id) === requestedProduct || String(item.sku) === requestedProduct) || products[0];
    if (!product) throw new Error("No matching utility product is currently available");
    const amount = Number(data.Amount || product.price || 0);
    const destination = String(data.Destination || "").replace(/\D/g, "");
    if (!/^\d{4,6}$/.test(String(data.pin || ""))) throw new Error("A 4–6 digit transaction PIN is required");
    return callMerchantApi<T>("createUtilityPurchase", {
      path: { id },
      idempotencyKey: createIdempotencyKey("utility", String(data.ClientReference || "")),
      body: {
        reference: String(data.ClientReference || `UTILITY_${crypto.randomUUID()}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64),
        productId: product.id,
        amount: amount.toFixed(2),
        currency: "GHS",
        beneficiary: { msisdn: destination, accountNumber: data.accountNumber || data.Destination },
        funding: { type: "wallet" },
        pin: data.pin,
      },
    });
  }
  switch (action) {
    case "getProfile": return callMerchantApi<T>("authMe");
    case "getVerificationLevel":
    case "getBusinessVerificationLevel": return callMerchantApi<T>("myVerificationLevel");
    case "checkEmailPhoneVerified": return callMerchantApi<T>("authMe");
    case "changePassword": return callMerchantApi<T>("authChangePassword", { body: {
      current_password: params.currentPassword, new_password: params.newPassword,
    } });
    case "requestVerifyEmail": return callMerchantApi<T>("authRequestEmailVerification");
    case "verifyLoggedInEmail": return callMerchantApi<T>("authConfirmEmailVerification", { body: { code: params.otp } });
    case "requestVerifyPhoneOTP": return callMerchantApi<T>("authRequestPhoneVerification");
    case "verifyPhone": return callMerchantApi<T>("authConfirmPhoneVerification", { body: { code: params.otp } });
    case "logout": return callMerchantApi<T>("authLogout");
    case "getBusinessInfo": return callMerchantApi<T>("getBusiness", { path });
    case "updateBusinessInfo": return callMerchantApi<T>("updateBusiness", { path, body: data });
    case "getBusinessOwners": return callMerchantApi<T>("listBusinessOwners", { path });
    case "addBusinessOwner": return callMerchantApi<T>("createBusinessOwner", { path, body: data });
    case "getBusinessAccounts": return callMerchantApi<T>("listBusinessAccounts", { path });
    case "addBusinessAccount": return callMerchantApi<T>("createBusinessAccount", { path, body: data });
    case "getTeams": return callMerchantApi<T>("listTeams", { path });
    case "createTeam": return callMerchantApi<T>("createTeam", { path, body: data });
    case "getTeamMembers": return callMerchantApi<T>("listTeamMembers", { path: { id: id || "", teamId: String(params.teamId || "") } });
    case "removeTeamMember": return callMerchantApi<T>("removeMember", { path: {
      id: id || "", teamId: String(params.teamId || ""), memberId: String(params.memberId || ""),
    } });
    case "createInvoiceCollection": return callMerchantApi<T>("createWalletCollection", {
      path, body: data, idempotencyKey: createIdempotencyKey("collection", String(data.reference || data.referenceid || "")),
    });
    case "walletTransfer": return callMerchantApi<T>("createWalletTransfer", {
      path, body: data, idempotencyKey: createIdempotencyKey("transfer", String(data.reference || "")),
    });
    case "getDashboardMetrics": {
      const now = new Date();
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const summary = await callMerchantApi<{
        totals?: Array<{ rail: string; currency: string; volume: string }>;
      }>("transactionSummary", {
        path,
        query: { from: from.toISOString(), to: now.toISOString(), bucket: "day", excludeSettlements: true },
      });
      const totals = summary.totals || [];
      const volumeFor = (rail: string) => totals
        .filter((item) => item.rail === rail && item.currency === "GHS")
        .reduce((sum, item) => sum + Number(item.volume || 0), 0);
      const totalCollection = volumeFor("collection");
      const totalDisbursement = volumeFor("payout") + volumeFor("utility");
      return {
        ...summary,
        total_collection: totalCollection,
        total_disbursement: totalDisbursement,
        net_cash_flow: totalCollection - totalDisbursement,
      } as T;
    }
    default: throw new Error(`Merchant API migration has no compatible operation for ${action}`);
  }
};

// Helper function to call edge functions with per-user iSmart token
async function callEdgeFunction<T>(
  functionName: string,
  action: string,
  params: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: T; error?: string; code?: string }> {
  try {
    void functionName;
    const data = await compatibilityCall<T>(action, params);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

export function useISmartAPI() {
  const { toast } = useToast();

  // ====================================================================
  // AUTH — ismart-auth
  // ====================================================================

  const login = useCallback(async (email: string, password: string) => {
    const result = await callEdgeFunction("ismart-auth", "login", { email, password });
    if (!result.success) {
      toast({ title: "Login Failed", description: result.error, variant: "destructive" });
    }
    return result;
  }, [toast]);

  const register = useCallback(async (params: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
    business_name?: string;
  }) => {
    const result = await callEdgeFunction("ismart-auth", params.business_name ? "registerBusiness" : "register", params);
    if (!result.success) {
      toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
    }
    return result;
  }, [toast]);

  const registerBusiness = useCallback(async (params: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
    business_name: string;
    business_type?: string;
  }) => {
    const result = await callEdgeFunction("ismart-auth", "registerBusiness", params);
    if (!result.success) {
      toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
    }
    return result;
  }, [toast]);

  const requestPasswordReset = useCallback(async (email: string) => {
    return callEdgeFunction("ismart-auth", "requestPasswordReset", { email });
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    return callEdgeFunction("ismart-auth", "resetPassword", { token, newPassword });
  }, []);

  const getAllServices = useCallback(async () => {
    return callEdgeFunction("ismart-auth", "getAllServices");
  }, []);

  const searchUser = useCallback(async (params: Record<string, unknown>) => {
    return callEdgeFunction("ismart-auth", "searchUser", params);
  }, []);

  // Password Reset OTP flow
  const requestPasswordResetOTP = useCallback(async (email: string) => {
    return callEdgeFunction("ismart-auth", "requestPasswordResetOTP", { email });
  }, []);

  const confirmPasswordResetOTP = useCallback(async (email: string, otp: string) => {
    return callEdgeFunction("ismart-auth", "confirmPasswordResetOTP", { email, otp });
  }, []);

  const resetPasswordWithOTP = useCallback(async (email: string, otp: string, newPassword: string, userId?: string) => {
    return callEdgeFunction("ismart-auth", "resetPasswordWithOTP", { email, otp, newPassword, userId });
  }, []);

  // Token
  const refreshToken = useCallback(async (refreshTokenValue: string) => {
    return callEdgeFunction("ismart-auth", "refreshToken", { refreshToken: refreshTokenValue });
  }, []);

  // Email / Phone Verification
  const requestVerifyEmail = useCallback(async () => {
    return callEdgeFunction("ismart-auth", "requestVerifyEmail");
  }, []);

  const verifyEmail = useCallback(async (email: string, otp: string) => {
    return callEdgeFunction("ismart-auth", "verifyEmail", { email, otp });
  }, []);

  const verifyLoggedInEmail = useCallback(async (otp: string) => {
    return callEdgeFunction("ismart-auth", "verifyLoggedInEmail", { otp });
  }, []);

  const requestVerifyPhoneOTP = useCallback(async (endpointType: string) => {
    return callEdgeFunction("ismart-auth", "requestVerifyPhoneOTP", { endpointType });
  }, []);

  const verifyPhone = useCallback(async (phoneNumber: string, otp: string) => {
    return callEdgeFunction("ismart-auth", "verifyPhone", { phoneNumber, otp });
  }, []);

  const checkEmailPhoneVerified = useCallback(async () => {
    return callEdgeFunction("ismart-auth", "checkEmailPhoneVerified");
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    return callEdgeFunction("ismart-auth", "changePassword", { currentPassword, newPassword });
  }, []);

  const logout = useCallback(async () => {
    const result = await callEdgeFunction("ismart-auth", "logout");
    localStorage.removeItem("ismart_access_token");
    localStorage.removeItem("ismart_refresh_token");
    localStorage.removeItem("ismart_user_id");
    localStorage.removeItem("ismart_user_data");
    localStorage.removeItem("ismart_email");
    localStorage.removeItem("ismart_business_id");
    localStorage.removeItem("ismart_recipient_id");
    return result;
  }, []);

  // ====================================================================
  // ACCOUNT — ismart-account
  // ====================================================================

  const getProfile = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getProfile");
  }, []);

  const getPersonalInfo = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getPersonalInfo");
  }, []);

  const updatePersonalInfo = useCallback(async (params: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "updatePersonalInfo", params);
  }, []);

  const getPreferences = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getPreferences");
  }, []);

  const updatePreferences = useCallback(async (params: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "updatePreferences", params);
  }, []);

  const getSecurityInfo = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getSecurityInfo");
  }, []);

  const addContactPerson = useCallback(async (params: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "addContactPerson", params);
  }, []);

  // PIN
  const setPin = useCallback(async (pin: string, confirmPin: string) => {
    return callEdgeFunction("ismart-account", "setPin", { pin, confirmPin });
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    return callEdgeFunction("ismart-account", "verifyPin", { pin });
  }, []);

  // 2FA
  const enable2FA = useCallback(async () => {
    return callEdgeFunction("ismart-account", "enable2FA");
  }, []);

  const disable2FA = useCallback(async () => {
    return callEdgeFunction("ismart-account", "disable2FA");
  }, []);

  // API Credentials
  const getAPICredentials = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getAPICredentials");
  }, []);

  const deleteAPICredential = useCallback(async (credentialId: string) => {
    return callEdgeFunction("ismart-account", "deleteAPICredential", { credentialId });
  }, []);

  // Messages
  const getMessages = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getMessages");
  }, []);

  const markMessageRead = useCallback(async (messageId: string) => {
    return callEdgeFunction("ismart-account", "markMessageRead", { messageId });
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    return callEdgeFunction("ismart-account", "deleteMessage", { messageId });
  }, []);

  const deleteAllMessages = useCallback(async () => {
    return callEdgeFunction("ismart-account", "deleteAllMessages");
  }, []);

  // Settlement (via account)
  const getSettlementAccounts = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getSettlementAccounts");
  }, []);

  const addSettlementAccount = useCallback(async (account: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "addSettlementAccount", { account });
  }, []);

  const updateSettlementAccount = useCallback(async (accountId: string, updates: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "updateSettlementAccount", { accountId, updates });
  }, []);

  const deleteSettlementAccount = useCallback(async (accountId: string) => {
    return callEdgeFunction("ismart-account", "deleteSettlementAccount", { accountId });
  }, []);

  const getSettlementMode = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getSettlementMode");
  }, []);

  const setSettlementMode = useCallback(async (mode: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "setSettlementMode", { mode });
  }, []);

  // Reports & Dashboard
  const getReport = useCallback(async (params: { start_date: string; end_date: string; service_type?: string }) => {
    return callEdgeFunction("ismart-account", "getReport", params);
  }, []);

  const getDashboardMetrics = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getDashboardMetrics");
  }, []);

  // KYC
  const getVerificationLevel = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getVerificationLevel");
  }, []);

  const uploadKYCDocs = useCallback(async (params: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "uploadKYCDocs", params);
  }, []);

  const getKYCDocs = useCallback(async () => {
    return callEdgeFunction("ismart-account", "getKYCDocs");
  }, []);

  // Logo
  const addLogo = useCallback(async (params: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "addLogo", params);
  }, []);

  const getLogoUrl = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-account", "getLogoUrl", { businessId });
  }, []);

  // Wallet (legacy)
  const addFunds = useCallback(async (params: Record<string, unknown>) => {
    return callEdgeFunction("ismart-account", "addFunds", params);
  }, []);

  // ====================================================================
  // COMMUNICATIONS — ismart-communications
  // ====================================================================

  const sendSMS = useCallback(async (to: string, message: string, senderId?: string) => {
    return callEdgeFunction("ismart-communications", "sendSMS", { to, message, senderId });
  }, []);

  const getSMSBalance = useCallback(async () => {
    return callEdgeFunction("ismart-communications", "getSMSBalance");
  }, []);

  const getSMSHistory = useCallback(async (page: number = 1, limit: number = 50) => {
    return callEdgeFunction("ismart-communications", "getSMSHistory", { page, limit });
  }, []);

  // ====================================================================
  // BUSINESS — ismart-business
  // ====================================================================

  const getBusinessInfo = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-business", "getBusinessInfo", { businessId });
  }, []);

  const updateBusinessInfo = useCallback(async (businessId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-business", "updateBusinessInfo", { businessId, data });
  }, []);

  const getBusinessVerificationStatus = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-business", "getBusinessVerificationStatus", { businessId });
  }, []);

  const getBusinessVerificationLevel = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-business", "getBusinessVerificationLevel", { businessId });
  }, []);

  const uploadBusinessDocuments = useCallback(async (businessId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-business", "uploadBusinessDocuments", { businessId, data });
  }, []);

  const getBusinessDocuments = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-business", "getBusinessDocuments", { businessId });
  }, []);

  const addBusinessOwner = useCallback(async (businessId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-business", "addBusinessOwner", { businessId, data });
  }, []);

  const getBusinessOwners = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-business", "getBusinessOwners", { businessId });
  }, []);

  const getBusinessAccounts = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-business", "getBusinessAccounts", { businessId });
  }, []);

  const addBusinessAccount = useCallback(async (businessId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-business", "addBusinessAccount", { businessId, data });
  }, []);

  // Teams
  const getTeams = useCallback(async (businessId: string) => {
    return callEdgeFunction("ismart-business", "getTeams", { businessId });
  }, []);

  const createTeam = useCallback(async (businessId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-business", "createTeam", { businessId, data });
  }, []);

  const updateTeam = useCallback(async (teamId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-business", "updateTeam", { teamId, data });
  }, []);

  const getTeamMembers = useCallback(async (teamId: string) => {
    return callEdgeFunction("ismart-business", "getTeamMembers", { teamId });
  }, []);

  const addTeamMember = useCallback(async (teamId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-business", "addTeamMember", { teamId, data });
  }, []);

  const removeTeamMember = useCallback(async (teamId: string, memberId: string) => {
    return callEdgeFunction("ismart-business", "removeTeamMember", { teamId, memberId });
  }, []);

  const getTeamDetails = useCallback(async (teamId: string) => {
    return callEdgeFunction("ismart-business", "getTeamDetails", { teamId });
  }, []);

  // Settlements (admin)
  const getSettlementsReport = useCallback(async (params?: Record<string, string>) => {
    return callEdgeFunction("ismart-business", "getSettlementsReport", params || {});
  }, []);

  const getAdminSettlements = useCallback(async (params?: Record<string, string>) => {
    return callEdgeFunction("ismart-business", "getAdminSettlements", params || {});
  }, []);

  // ====================================================================
  // SECURITY — ismart-security
  // ====================================================================

  const getSecurityInfoSec = useCallback(async () => {
    return callEdgeFunction("ismart-security", "getSecurityInfo");
  }, []);

  // ====================================================================
  // FINANCE — ismart-finance (Disbursements, Collections, Settlements)
  // ====================================================================

  // Disbursements
  const createDisbursement = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "createDisbursement", { data });
  }, []);

  const getDisbursements = useCallback(async (page?: number, limit?: number) => {
    return callEdgeFunction("ismart-finance", "getDisbursements", { page, limit });
  }, []);

  const getDisbursement = useCallback(async (disbursementId: string) => {
    return callEdgeFunction("ismart-finance", "getDisbursement", { disbursementId });
  }, []);

  const updateDisbursement = useCallback(async (disbursementId: string, data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "updateDisbursement", { disbursementId, data });
  }, []);

  const deleteDisbursement = useCallback(async (disbursementId: string) => {
    return callEdgeFunction("ismart-finance", "deleteDisbursement", { disbursementId });
  }, []);

  const processDisbursement = useCallback(async (disbursementId: string) => {
    return callEdgeFunction("ismart-finance", "processDisbursement", { disbursementId });
  }, []);

  const bulkDisbursement = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "bulkDisbursement", { data });
  }, []);

  const walletTransfer = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "walletTransfer", { data });
  }, []);

  // Payroll
  const processEmployeePayments = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "processEmployeePayments", { data });
  }, []);

  // Settlement Request
  const createSettlementRequest = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "createSettlementRequest", { data });
  }, []);

  // Collections
  const createInvoiceCollection = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "createInvoiceCollection", { data });
  }, []);

  const createBankCollection = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-finance", "createBankCollection", { data });
  }, []);

  // ====================================================================
  // UTILITIES — ismart-utilities
  // ====================================================================

  const fetchAllBillers = useCallback(async () => {
    return callEdgeFunction("ismart-utilities", "fetchAllBillers");
  }, []);

  const fetchBillerItems = useCallback(async (billerId: string) => {
    return callEdgeFunction("ismart-utilities", "fetchBillerItems", { billerId });
  }, []);

  const queryElectricity = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryElectricity", { data });
  }, []);

  const buyElectricity = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyElectricity", { data });
  }, []);

  const queryWater = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryWater", { data });
  }, []);

  const buyWater = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyWater", { data });
  }, []);

  const queryMTNData = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryMTNData", { data });
  }, []);

  const buyMTNData = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyMTNData", { data });
  }, []);

  const buyMTNAirtime = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyMTNAirtime", { data });
  }, []);

  const buyTelecelAirtime = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyTelecelAirtime", { data });
  }, []);

  const buyATAirtime = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyATAirtime", { data });
  }, []);

  const queryTelecelData = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryTelecelData", { data });
  }, []);

  const buyTelecelData = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyTelecelData", { data });
  }, []);

  const queryATData = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryATData", { data });
  }, []);

  const buyATData = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyATData", { data });
  }, []);

  const queryMTNBroadband = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryMTNBroadband", { data });
  }, []);

  const buyMTNBroadband = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyMTNBroadband", { data });
  }, []);

  const queryTelecelBroadband = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryTelecelBroadband", { data });
  }, []);

  const buyTelecelBroadband = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyTelecelBroadband", { data });
  }, []);

  const queryDStv = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryDStv", { data });
  }, []);

  const buyDStv = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyDStv", { data });
  }, []);

  const queryGOtv = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryGOtv", { data });
  }, []);

  const buyGOtv = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyGOtv", { data });
  }, []);

  const queryStarTimes = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "queryStarTimes", { data });
  }, []);

  const buyStarTimes = useCallback(async (data: Record<string, unknown>) => {
    return callEdgeFunction("ismart-utilities", "buyStarTimes", { data });
  }, []);

  return {
    // Auth
    login,
    register,
    registerBusiness,
    requestPasswordReset,
    resetPassword,
    getAllServices,
    searchUser,
    requestPasswordResetOTP,
    confirmPasswordResetOTP,
    resetPasswordWithOTP,
    refreshToken,
    requestVerifyEmail,
    verifyEmail,
    verifyLoggedInEmail,
    requestVerifyPhoneOTP,
    verifyPhone,
    checkEmailPhoneVerified,
    changePassword,
    logout,

    // Account
    getProfile,
    getPersonalInfo,
    updatePersonalInfo,
    getPreferences,
    updatePreferences,
    getSecurityInfo,
    addContactPerson,
    setPin,
    verifyPin,
    enable2FA,
    disable2FA,
    getAPICredentials,
    deleteAPICredential,
    getMessages,
    markMessageRead,
    deleteMessage,
    deleteAllMessages,
    getSettlementAccounts,
    addSettlementAccount,
    updateSettlementAccount,
    deleteSettlementAccount,
    getSettlementMode,
    setSettlementMode,
    getReport,
    getDashboardMetrics,
    getVerificationLevel,
    uploadKYCDocs,
    getKYCDocs,
    addLogo,
    getLogoUrl,
    addFunds,

    // Communications
    sendSMS,
    getSMSBalance,
    getSMSHistory,

    // Business
    getBusinessInfo,
    updateBusinessInfo,
    getBusinessVerificationStatus,
    getBusinessVerificationLevel,
    uploadBusinessDocuments,
    getBusinessDocuments,
    addBusinessOwner,
    getBusinessOwners,
    getBusinessAccounts,
    addBusinessAccount,
    getTeams,
    createTeam,
    updateTeam,
    getTeamMembers,
    addTeamMember,
    removeTeamMember,
    getTeamDetails,
    getSettlementsReport,
    getAdminSettlements,

    // Security
    getSecurityInfoSec,

    // Finance
    createDisbursement,
    getDisbursements,
    getDisbursement,
    updateDisbursement,
    deleteDisbursement,
    processDisbursement,
    bulkDisbursement,
    walletTransfer,
    processEmployeePayments,
    createSettlementRequest,
    createInvoiceCollection,
    createBankCollection,

    // Utilities
    fetchAllBillers,
    fetchBillerItems,
    queryElectricity,
    buyElectricity,
    queryWater,
    buyWater,
    queryMTNData,
    buyMTNData,
    buyMTNAirtime,
    buyTelecelAirtime,
    buyATAirtime,
    queryTelecelData,
    buyTelecelData,
    queryATData,
    buyATData,
    queryMTNBroadband,
    buyMTNBroadband,
    queryTelecelBroadband,
    buyTelecelBroadband,
    queryDStv,
    buyDStv,
    queryGOtv,
    buyGOtv,
    queryStarTimes,
    buyStarTimes,
  };
}
