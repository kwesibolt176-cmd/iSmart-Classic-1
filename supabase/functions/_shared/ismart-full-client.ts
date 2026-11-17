// iSmart Full API Client - Complete integration for all documented endpoints
// Auth Service, Disbursement Service, Collection Service

export const ISMART_AUTH_SERVICE_URL = "https://gateway.ismartpay.org/auth-service/api";
export const ISMART_DISBURSEMENT_SERVICE_URL = "https://gateway.ismartpay.org/disbursement-service/api";
export const ISMART_COLLECTION_SERVICE_URL = "https://collection.ismartpay.org";
export const ISMART_UTILITY_SERVICE_URL = "https://utility.ismartpay.org/api/utilities";

// ============ Types ============

export interface ISmartLoginRequest {
  email: string;
  password: string;
}

export interface ISmartRegisterRequest {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone_number: string;
  country?: string;
  password: string;
  business_name?: string;
}

export interface ISmartRegisterBusinessRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  business_name: string;
  /** iSmart only accepts 'starter' or 'registered'. */
  business_type: "starter" | "registered";
  country: string;
  category: string;
  industry: string;
}


export interface ISmartPasswordResetRequest {
  email: string;
}

export interface ISmartPasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ISmartOTPVerifyRequest {
  email: string;
  otp: string;
}

export interface ISmartProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  businessName?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface ISmartNotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  transactionAlerts: boolean;
  marketingEmails: boolean;
}

export interface ISmartDirectSMSRequest {
  to: string;
  message: string;
  senderId?: string;
}

export interface ISmartSMSBalanceResponse {
  balance: number;
  currency: string;
}

export interface ISmartSMSHistoryItem {
  id: string;
  to: string;
  message: string;
  status: string;
  sentAt: string;
  cost: number;
}

export interface ISmartTransactionReportParams {
  startDate?: string;
  endDate?: string;
  type?: "all" | "collections" | "disbursements";
  status?: "pending" | "completed" | "failed";
  page?: number;
  limit?: number;
}

export interface ISmartTeamMember {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "operator" | "viewer";
  permissions?: string[];
}

export interface ISmartKYCDocument {
  type: "id_card" | "passport" | "business_registration" | "utility_bill" | "bank_statement";
  file: string;
  fileName: string;
}

export interface ISmartPINSetRequest {
  pin: string;
  confirmPin: string;
}

export interface ISmartPINVerifyRequest {
  pin: string;
}

export interface ISmart2FAEnableRequest {
  method: "sms" | "authenticator";
}

export interface ISmart2FAVerifyRequest {
  code: string;
}

export interface ISmartPayrollItem {
  employeeId: string;
  employeeName: string;
  phoneNumber: string;
  accountNumber?: string;
  bankCode?: string;
  amount: number;
  channel: "MOBILE_MONEY" | "BANK";
  provider?: "MTN" | "TELECEL";
}

export interface ISmartPayrollBatch {
  batchId: string;
  name: string;
  totalAmount: number;
  paymentDate: string;
  items: ISmartPayrollItem[];
}

export interface ISmartSettlementAccount {
  id?: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  isDefault?: boolean;
  channel: "BANK" | "MOBILE_MONEY";
  provider?: string;
}

export interface ISmartVerifyAccountRequest {
  accountNumber: string;
  bankCode: string;
}

export interface ISmartVerifyAccountResponse {
  accountName: string;
  accountNumber: string;
  bankName: string;
  isValid: boolean;
}

export interface ISmartResponse<T = unknown> {
  success: boolean;
  code?: string;
  Status?: string;
  message?: string;
  data?: T;
  Data?: T;
  error?: string;
}

export interface ISmartAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    businessName?: string;
    isVerified: boolean;
    kycLevel: number;
  };
}

export interface ISmartProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  businessName?: string;
  businessType?: string;
  address?: string;
  city?: string;
  country?: string;
  isVerified: boolean;
  kycLevel: number;
  createdAt: string;
  walletBalance?: number;
}

// ============ Full Client Class ============

export class ISmartFullClient {
  private apiKey: string;
  private accessToken?: string;
  private userId?: string;

  constructor(apiKey: string, accessToken?: string, userId?: string) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
    this.userId = userId;
  }

  private async request<T>(
    baseUrl: string,
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
    body?: unknown,
    additionalHeaders?: Record<string, string>,
    skipAuth: boolean = false
  ): Promise<ISmartResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...additionalHeaders,
    };

    if (this.accessToken && !skipAuth) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Auth-service endpoints identify the user from the Bearer token. Sending
    // recipientid there makes some valid accounts fail with "Customer not found".
    // Keep recipientid only for downstream services that actually require it.
    if (this.userId && this.userId !== "anonymous" && baseUrl !== ISMART_AUTH_SERVICE_URL) {
      headers["recipientid"] = this.userId;
    }


    //New code
//===============================
    const fetchOptions: RequestInit = { method, headers };
    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutMs = 15000; // 15s upstream timeout, well under the isolate wall-clock limit
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`iSmart API request timed out after ${timeoutMs}ms: ${baseUrl}${endpoint}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    

    //=========================================================
    //const fetchOptions: RequestInit = { method, headers };
    //if (body && method !== "GET") {
     // fetchOptions.body = JSON.stringify(body);
   // }

    //const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    //=============================================================


    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${text.substring(0, 200)}`);
      }
      // Try parsing as JSON anyway
      try {
        return JSON.parse(text);
      } catch {
        return { success: true, data: text } as any;
      }
    }
    const result = await response.json();

    if (!response.ok) {
      let errorMsg = result.message || result.error || `API error: ${response.status}`;
      if (result.errors) {
        const details = Array.isArray(result.errors)
          ? result.errors.map((e: any) => e.message || e.msg || JSON.stringify(e)).join("; ")
          : JSON.stringify(result.errors);
        errorMsg = `${errorMsg}: ${details}`;
      }
      if (result.details) {
        errorMsg = `${errorMsg}: ${JSON.stringify(result.details)}`;
      }
      console.error("iSmart API error response:", JSON.stringify(result));
      throw new Error(errorMsg);
    }

    return result;
  }

  // ====================================================================
  // PUBLIC AUTH (no token; uses X-Skip-Auth: 1)
  // ====================================================================

  async login(params: ISmartLoginRequest): Promise<ISmartResponse<ISmartAuthResponse>> {
    const result = await this.request<ISmartAuthResponse>(
      ISMART_AUTH_SERVICE_URL, "/publicauth/login", "POST", params,
      { "X-Skip-Auth": "1" }, true
    );
    if (result.data?.accessToken) {
      this.accessToken = result.data.accessToken;
      this.userId = result.data.user.id;
    }
    return result;
  }

  async register(params: ISmartRegisterRequest): Promise<ISmartResponse<ISmartAuthResponse>> {
    return this.request<ISmartAuthResponse>(
      ISMART_AUTH_SERVICE_URL, "/publicauth/register", "POST", params,
      { "X-Skip-Auth": "1" }, true
    );
  }

  async registerBusiness(params: ISmartRegisterBusinessRequest): Promise<ISmartResponse<ISmartAuthResponse>> {
    return this.request<ISmartAuthResponse>(
      ISMART_AUTH_SERVICE_URL, "/publicauth/register-business", "POST", params,
      { "X-Skip-Auth": "1" }, true
    );
  }

  async requestPasswordReset(params: ISmartPasswordResetRequest): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/password/request-reset", "POST", params,
      { "X-Skip-Auth": "1" }, true
    );
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/password/reset", "POST", { email, token, newPassword },
      { "X-Skip-Auth": "1" }, true
    );
  }

  async getAllServices(): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/get-all-services", "GET", undefined,
      { "X-Skip-Auth": "1" }, true
    );
  }

  async searchUser(params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/search-user", "POST", params,
      { "X-Skip-Auth": "1" }, true
    );
  }

  // ====================================================================
  // PASSWORD RESET (OTP flow) — /api/publicauth/password/*
  // ====================================================================

  async requestPasswordResetOTP(email: string): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/password/request-reset", "POST", { email },
      { "X-Skip-Auth": "1" }, true
    );
  }

  async confirmPasswordResetOTP(otp: string, userId: string): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/password/confirm-otp", "POST", { otp, userId },
      { "X-Skip-Auth": "1" }, true
    );
  }

  async resetPasswordWithOTP(params: { email?: string; userId: string; otp: string; newPassword: string }): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/password/reset", "POST",
      {
        userId: params.userId,
        ...(params.email ? { email: params.email } : {}),
        token: params.otp,
        otp: params.otp,
        newPassword: params.newPassword,
      },
      { "X-Skip-Auth": "1" }, true
    );
  }


  // ====================================================================
  // TOKEN
  // ====================================================================

  async refreshToken(refreshToken: string): Promise<ISmartResponse<{ accessToken: string }>> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/auth/token/refresh", "POST",
      { refreshToken }, { "X-Skip-Auth": "1" }, true
    );
  }

  async logout(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/logout", "POST");
  }

  // ====================================================================
  // EMAIL / PHONE VERIFICATION
  // ====================================================================

  async requestVerifyEmail(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/request-verify-email", "GET");
  }

  async verifyEmail(params: ISmartOTPVerifyRequest): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, "/publicauth/verify-email", "POST", params,
      { "X-Skip-Auth": "1" }, true
    );
  }

  async verifyLoggedInEmail(params: { otp: string }): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/verify-loggedin-email", "POST", params);
  }

  async requestVerifyPhoneOTPPublic(type: string): Promise<ISmartResponse> {
    return this.request(
      ISMART_AUTH_SERVICE_URL, `/publicauth/request-verify-phone-otp/${type}`, "GET",
      undefined, { "X-Skip-Auth": "1" }, true
    );
  }

  async requestVerifyPhoneOTP(endpointType: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/request-verify-phone-otp/${endpointType}`, "GET");
  }

  async verifyPhone(otp: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/verify-phone", "POST", { otp });
  }

  async checkEmailPhoneVerified(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/check-email-phone-verified", "GET");
  }

  // ====================================================================
  // PROFILE & PREFERENCES
  // ====================================================================

  async getPersonalInfo(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/personal-info", "GET");
  }

  async updatePersonalInfo(params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/personal-info", "PUT", params);
  }

  async getPreferences(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/preferences", "GET");
  }

  async updatePreferences(params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/preferences", "PUT", params);
  }

  async getSecurityInfo(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/security", "GET");
  }

  async setPin(params: ISmartPINSetRequest): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/set-pin", "PUT", params);
  }

  async verifyPin(params: ISmartPINVerifyRequest): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/verify-pin", "POST", params);
  }

  async enable2FA(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/enable-2FA", "GET");
  }

  async disable2FA(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/disable-2FA", "GET");
  }

  async addContactPerson(params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/contact-person/personal-info", "POST", params);
  }

  // ====================================================================
  // API CREDENTIALS
  // ====================================================================

  async getAPICredentials(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/api-credentials", "GET");
  }

  async deleteAPICredential(credentialId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/profile/api-credentials/${credentialId}`, "DELETE");
  }

  // ====================================================================
  // NOTIFICATIONS / MESSAGES
  // ====================================================================

  async getMessages(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/messages", "GET");
  }

  async markMessageRead(messageId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/messages/read/${messageId}`, "PUT");
  }

  async deleteMessage(messageId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/messages/delete/${messageId}`, "DELETE");
  }

  async deleteAllMessages(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/messages/delete-all", "DELETE");
  }

  // ====================================================================
  // PASSWORD (authenticated)
  // ====================================================================

  async changePassword(params: ISmartPasswordChangeRequest): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/password/change", "PUT", params);
  }

  // ====================================================================
  // REPORTS
  // ====================================================================

  async getReport(params: { start_date: string; end_date: string; service_type?: string }): Promise<ISmartResponse> {
    const query = new URLSearchParams();
    query.set("start_date", params.start_date);
    query.set("end_date", params.end_date);
    if (params.service_type) query.set("service_type", params.service_type);
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/get-report?${query.toString()}`, "GET");
  }

  // ====================================================================
  // DASHBOARD
  // ====================================================================

  async getDashboardMetrics(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/get-dashboard-metrics", "GET");
  }

  // ====================================================================
  // VERIFICATION / KYC
  // ====================================================================

  async getVerificationLevel(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/get-verification-level", "GET");
  }

  async getBusinessVerificationLevel(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/get-verification-level`, "GET");
  }

  async getProfile(): Promise<ISmartResponse<ISmartProfileResponse>> {
    return this.request<ISmartProfileResponse>(ISMART_AUTH_SERVICE_URL, "/auth/get-profile", "GET");
  }

  async uploadKYCDocs(params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/kyc-docs", "POST", params);
  }

  async getKYCDocs(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/kyc-docs/", "GET");
  }

  async uploadBusinessDocuments(businessId: string, params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/documents`, "POST", params);
  }

  async getBusinessDocuments(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/documents/`, "GET");
  }

  // ====================================================================
  // BUSINESS PROFILE (logo & business info)
  // ====================================================================

  async getBusinessInfo(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/business-info`, "GET");
  }

  async updateBusinessInfo(businessId: string, params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/business-info`, "PUT", params);
  }

  async getBusinessVerificationStatus(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/verification-status`, "GET");
  }

  async addLogo(params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/add-logo", "POST", params);
  }

  async getLogoUrl(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/profile/logo-url?businessId=${businessId}`, "GET");
  }

  // ====================================================================
  // BUSINESS OWNERS
  // ====================================================================

  async addBusinessOwner(businessId: string, params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/owners`, "POST", params);
  }

  async getBusinessOwners(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/owners`, "GET");
  }

  // ====================================================================
  // BUSINESS ACCOUNTS (bank/momo settlement accounts for business)
  // ====================================================================

  async getBusinessAccounts(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/accounts`, "GET");
  }

  async addBusinessAccount(businessId: string, params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/business/${businessId}/accounts`, "POST", params);
  }

  // ====================================================================
  // SETTLEMENT ACCOUNTS (profile)
  // ====================================================================

  async getSettlementAccounts(): Promise<ISmartResponse<ISmartSettlementAccount[]>> {
    return this.request<ISmartSettlementAccount[]>(ISMART_AUTH_SERVICE_URL, "/auth/profile/settlement-account", "GET");
  }

  async addSettlementAccount(account: ISmartSettlementAccount): Promise<ISmartResponse<ISmartSettlementAccount>> {
    return this.request<ISmartSettlementAccount>(ISMART_AUTH_SERVICE_URL, "/auth/profile/settlement-account", "POST", account);
  }

  async updateSettlementAccount(accountId: string, updates: Partial<ISmartSettlementAccount>): Promise<ISmartResponse<ISmartSettlementAccount>> {
    return this.request<ISmartSettlementAccount>(ISMART_AUTH_SERVICE_URL, `/auth/profile/settlement-account/${accountId}`, "POST", updates);
  }

  async deleteSettlementAccount(accountId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/profile/settlement-account/${accountId}`, "DELETE");
  }

  async getSettlementMode(): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/settlement-mode", "GET");
  }

  async setSettlementMode(mode: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/profile/settlement-mode", "POST", mode);
  }

  // ====================================================================
  // TEAMS
  // ====================================================================

  async getTeams(businessId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/team/${businessId}`, "GET");
  }

  async createTeam(businessId: string, params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/team/${businessId}/create`, "POST", params);
  }

  async updateTeam(teamId: string, params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/team/${teamId}/update`, "PUT", params);
  }

  async getTeamMembers(teamId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/team/${teamId}/members`, "GET");
  }

  async addTeamMember(teamId: string, params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/team/${teamId}/add-member`, "POST", params);
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/team/${teamId}/remove-member/${memberId}`, "DELETE");
  }

  async getTeamDetails(teamId: string): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, `/team/${teamId}/teamdetails`, "GET");
  }

  // ====================================================================
  // WALLET (legacy)
  // ====================================================================

  async addFunds(params: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/auth/add-funds", "POST", params);
  }

  // ====================================================================
  // SMS (Auth Service)
  // ====================================================================

  async sendSMS(params: ISmartDirectSMSRequest): Promise<ISmartResponse> {
    return this.request(ISMART_AUTH_SERVICE_URL, "/sms/send", "POST", {
      phone: params.to,
      message: params.message,
      sender_id: params.senderId || "iSmartPay",
    });
  }

  async getSMSBalance(): Promise<ISmartResponse<ISmartSMSBalanceResponse>> {
    return this.request<ISmartSMSBalanceResponse>(ISMART_AUTH_SERVICE_URL, "/sms/balance", "GET");
  }

  async getSMSHistory(page: number = 1, limit: number = 50): Promise<ISmartResponse<ISmartSMSHistoryItem[]>> {
    return this.request<ISmartSMSHistoryItem[]>(ISMART_AUTH_SERVICE_URL, `/sms/history?page=${page}&limit=${limit}`, "GET");
  }

  // ====================================================================
  // SETTLEMENTS (report/admin)
  // ====================================================================

  async getSettlementsReport(params?: Record<string, string>): Promise<ISmartResponse> {
    const query = new URLSearchParams(params || {});
    const qs = query.toString();
    return this.request(ISMART_AUTH_SERVICE_URL, `/auth/settlements/report${qs ? `?${qs}` : ""}`, "GET");
  }

  async getAdminSettlements(params?: Record<string, string>): Promise<ISmartResponse> {
    const query = new URLSearchParams(params || {});
    const qs = query.toString();
    return this.request(ISMART_AUTH_SERVICE_URL, `/admin/settlements${qs ? `?${qs}` : ""}`, "GET");
  }

  // ====================================================================
  // DISBURSEMENT SERVICE
  // ====================================================================

  async createDisbursement(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, "/v1/disbursements", "POST", data);
  }

  async getDisbursements(page?: number, limit?: number): Promise<ISmartResponse> {
    const query = new URLSearchParams();
    if (page) query.set("page", page.toString());
    if (limit) query.set("limit", limit.toString());
    const qs = query.toString();
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, `/v1/disbursements${qs ? `?${qs}` : ""}`, "GET");
  }

  async getDisbursement(disbursementId: string): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, `/v1/disbursements/${disbursementId}`, "GET");
  }

  async updateDisbursement(disbursementId: string, data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, `/v1/disbursements/${disbursementId}`, "PUT", data);
  }

  async deleteDisbursement(disbursementId: string): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, `/v1/disbursements/${disbursementId}`, "DELETE");
  }

  async processDisbursement(disbursementId: string): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, `/v1/disbursements/${disbursementId}/process`, "POST");
  }

  async bulkDisbursement(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, "/v1/disbursements/bulk-v1", "POST", data);
  }

  async walletTransfer(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, "/v1/disbursements/wallet-transfer", "POST", data);
  }

  // ====================================================================
  // DISBURSEMENT SERVICE — PAYROLL
  // ====================================================================

  async processEmployeePayments(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, "/v1/employee-payments/process", "POST", data);
  }

  // ====================================================================
  // DISBURSEMENT SERVICE — SETTLEMENT REQUEST
  // ====================================================================

  async createSettlementRequest(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, "/v1/settlements", "POST", data);
  }

  // ====================================================================
  // COLLECTION SERVICE
  // ====================================================================

  async createInvoiceCollection(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_COLLECTION_SERVICE_URL, "/momo-collection", "POST", data);
  }

  async createBankCollection(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_COLLECTION_SERVICE_URL, "/bank-collection", "POST", data);
  }

  // ====================================================================
  // BILLERS (Disbursement Service)
  // ====================================================================

  async fetchAllBillers(): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, "/billers/fetch-all-billers", "GET");
  }

  async fetchBillerItems(billerId: string): Promise<ISmartResponse> {
    return this.request(ISMART_DISBURSEMENT_SERVICE_URL, `/billers/fetch-items/${billerId}`, "GET");
  }

  // ====================================================================
  // UTILITY SERVICE — Electricity, Water, Data, Airtime
  // Per Postman docs: /query endpoints are GET with ?destination= (& ?mobile=)
  // Purchase endpoints are POST and accept an optional service_id header.
  // ====================================================================

  private buildQuery(params: Record<string, unknown>): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") usp.append(k, String(v));
    }
    const s = usp.toString();
    return s ? `?${s}` : "";
  }

  private utilityHeaders(data: Record<string, unknown>): Record<string, string> {
    const h: Record<string, string> = {};
    if (data.service_id) h["service_id"] = String(data.service_id);
    return h;
  }

  async queryElectricity(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-electricity/query${qs}`, "GET");
  }

  async buyElectricity(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-electricity", "POST", data, this.utilityHeaders(data));
  }

  async queryWater(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({
      destination: data.destination ?? data.Destination,
      mobile: data.mobile ?? data.Mobile,
    });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-water/query${qs}`, "GET");
  }

  async buyWater(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-water", "POST", data, this.utilityHeaders(data));
  }

  async queryMTNData(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-mtn-data/query${qs}`, "GET");
  }

  async buyMTNData(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-mtn-data", "POST", data, this.utilityHeaders(data));
  }

  async buyMTNAirtime(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-mtn-airtime", "POST", data, this.utilityHeaders(data));
  }

  async buyTelecelAirtime(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-telecel-airtime", "POST", data, this.utilityHeaders(data));
  }

  async buyATAirtime(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-at-airtime", "POST", data, this.utilityHeaders(data));
  }

  // MTN Broadband
  async queryMTNBroadband(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-mtn-broadband/query${qs}`, "GET");
  }

  async buyMTNBroadband(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-mtn-broadband", "POST", data, this.utilityHeaders(data));
  }

  // Telecel Broadband — query is GET with ?destination=
  async queryTelecelBroadband(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-telecel-broadband/query${qs}`, "GET");
  }

  async buyTelecelBroadband(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-telecel-broadband", "POST", data, this.utilityHeaders(data));
  }

  // Telecel Data
  async queryTelecelData(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-telecel-data/query${qs}`, "GET");
  }

  async buyTelecelData(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-telecel-data", "POST", data, this.utilityHeaders(data));
  }

  // AT (AirtelTigo) Data
  async queryATData(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-at-data/query${qs}`, "GET");
  }

  async buyATData(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-at-data", "POST", data, this.utilityHeaders(data));
  }

  // TV Services — query endpoints are GET with ?destination=
  async queryDStv(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-dstv/query${qs}`, "GET");
  }

  async buyDStv(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-dstv", "POST", data, this.utilityHeaders(data));
  }

  async queryGOtv(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-gotv/query${qs}`, "GET");
  }

  async buyGOtv(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-gotv", "POST", data, this.utilityHeaders(data));
  }

  async queryStarTimes(data: Record<string, unknown>): Promise<ISmartResponse> {
    const qs = this.buildQuery({ destination: data.destination ?? data.Destination });
    return this.request(ISMART_UTILITY_SERVICE_URL, `/buy-startimes/query${qs}`, "GET");
  }

  async buyStarTimes(data: Record<string, unknown>): Promise<ISmartResponse> {
    return this.request(ISMART_UTILITY_SERVICE_URL, "/buy-startimes", "POST", data, this.utilityHeaders(data));
  }
}

// ============ Helper Functions ============

export function generateReference(prefix: string = "TXN"): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function formatGhanaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith("233")) {
    cleaned = "233" + cleaned;
  }
  return cleaned;
}

// Helper to get API key and per-user tokens.
// IMPORTANT: tokens (accessToken / userId) MUST come from the request
// (i.e., the calling user's localStorage). We never fall back to a global
// shared value, which would leak one user's iSmart identity to others.
export async function getISmartCredentials(
  supabase: unknown,
  requestTokens?: { ismartAccessToken?: string; ismartUserId?: string }
): Promise<{ apiKey: string | null; accessToken: string | null; userId: string | null }> {
  const supabaseClient = supabase as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: { setting_value: string } | null }> } } } };

  try {
    const { getPlatformSecret } = await import("./platform-secrets.ts");
    const encryptedApiKey = await getPlatformSecret(supabase as never, "integration:ismart:ismart_api_key");
    const { data: apiKeyData } = await supabaseClient
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "secret_ismart_ismart_api_key")
      .single();

    return {
      apiKey: encryptedApiKey || (apiKeyData?.setting_value ? atob(apiKeyData.setting_value) : null),
      accessToken: requestTokens?.ismartAccessToken || null,
      userId: requestTokens?.ismartUserId || null,
    };
  } catch (error) {
    console.error("Error fetching iSmart credentials:", error);
    return { apiKey: null, accessToken: null, userId: null };
  }
}
