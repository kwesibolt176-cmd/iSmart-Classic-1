// iSmart Financial API Client - Collections, Disbursements, Wallet operations
// Base URLs from API documentation

export const ISMART_AUTH_SERVICE_URL = "https://gateway.ismartpay.org/auth-service/api";
export const ISMART_DISBURSEMENT_SERVICE_URL = "https://gateway.ismartpay.org/disbursement-service/api";
export const ISMART_COLLECTION_SERVICE_URL = "https://collection.ismartpay.org";
export const ISMART_STATUS_CHECK_URL = "https://prodcheck.ismartghana.com";

// Service IDs from /publicauth/get-all-services (required as `service-id` header)
export const ISMART_SERVICE_IDS = {
  disbursement: "055f5e9a-c888-4523-9cc2-44260d5a1635",
  collection: "ad586289-6e41-4114-9011-c65616f61452",
  payment: "044a574b-fb74-4c03-9584-092fca203f17",
  settlement: "4e01607b-d557-443d-96fe-96c4a4265e70",
} as const;

// Collections authenticate with the user's bearer token from the login endpoint.
// apiId / apiSecret are only for direct (server-to-server) API consumers.



// ============ Types ============

export interface ISmartCustomer {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
}

export interface ISmartDisbursementRequest {
  reference: string;
  disburseType: "deposit";
  customer: ISmartCustomer;
  provider: "MTN" | "TELECEL" | string; // Bank code for bank transfers
  narration: string;
  channel: "MOBILE_MONEY" | "BANK" | "WALLET";
  amount: string | number;
  currency: string;
  source?: string;
  paymentDetails: {
    momoNumber?: string;
    accountNumber?: string;
    accountName?: string;
    bankCode?: string;
    bankbranchCode?: string;
    paymentMode?: string;
    country?: string; // Required for TELECEL
  };
}

export interface ISmartBulkDisbursementRequest {
  batchNumber: string;
  totalAmount: string;
  records: ISmartDisbursementRequest[];
}

export interface ISmartWalletTransferRequest {
  amount: string;
  recipientId: string;
  currency: string;
}

export interface ISmartCollectionRequest {
  referenceid: string;
  paymentType: "INVOICE" | "TOPUP";
  customer: ISmartCustomer;
  provider: "MTN" | "TELECEL";
  msisdn: string;
  payee_note: string;
  amount: string;
  narration: string;
  channel: "MOMO" | "BANK";
  currency: string;
  network: "MOMO-MTN" | "MOMO-TELECEL" | "MTN" | "TELECEL";
  AccountId: string;
  callbackurl: string;
  items?: Array<{
    description?: string;
    name?: string;
    quantity: number;
    unitPrice: string | number;
    total?: number;
  }>;
}

export interface ISmartFinancialResponse {
  code?: string;
  Status?: string;
  message?: string;
  fallback?: boolean;
  upstreamStatus?: number;
  data?: any;
  Data?: any;
}

// ============ Client Class ============

export class ISmartFinancialClient {
  private accessToken: string;
  //private userId: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    //this.userId = userId;
  }

  private async request<T>(
    baseUrl: string,
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
    body?: unknown,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders,
    };

    // Only add Authorization header if X-Skip-Auth is NOT set
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    



    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let result: any;
    
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      console.error("Non-JSON response from iSmart API:", text?.substring(0, 500));
      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${text?.substring(0, 200) || "Empty response"}`);
      }
      result = { Status: response.ok ? "Success" : "Failed", rawResponse: text };
    }

    if (!response.ok) {
      console.error(`iSmart API error [${response.status}]:`, JSON.stringify(result).substring(0, 500));
      const isGatewayFailure = response.status >= 500;
      // Upstream puts validation/limit errors in Data.errorMessageList
      const listed =
        result?.Data?.errorMessageList ||
        result?.data?.errorMessageList ||
        result?.errorMessageList;
      const upstreamMessage = Array.isArray(listed) && listed.length
        ? listed.join(", ")
        : result.message || result.error || result.Message;
      // Return the error result instead of throwing, so callers can handle it gracefully
      return {
        Status: "Failed",
        code: result?.ResponseCode || response.status.toString(),
        message: isGatewayFailure
          ? "iSmart payment service is temporarily unavailable. Please try again shortly."
          : upstreamMessage || `iSmart API returned ${response.status}`,
        fallback: isGatewayFailure,
        upstreamStatus: response.status,
        data: result,
      } as T;
    }


    return result;
  }

  // ============ Disbursements ============

  /**
   * Create a Mobile Money disbursement (MTN or Telecel)
   */
  async createMoMoDisbursement(params: {
    reference: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    momoNumber: string;
    amount: number;
    narration: string;
    provider: "MTN" | "TELECEL";
    currency?: string;
  }): Promise<ISmartFinancialResponse> {
    const payload: ISmartDisbursementRequest = {
      reference: params.reference,
      disburseType: "deposit",
      customer: {
        firstName: params.firstName,
        lastName: params.lastName,
        phoneNumber: params.phoneNumber,
      },
      provider: params.provider,
      narration: params.narration,
      channel: "MOBILE_MONEY",
      amount: Number(params.amount),
      currency: params.currency || "GHS",
      source: "dashboard",
      paymentDetails: {
        momoNumber: params.momoNumber,
        ...(params.provider === "TELECEL" && { country: "GHA" }),
      },
    };

    return this.request<ISmartFinancialResponse>(
      ISMART_DISBURSEMENT_SERVICE_URL,
      "/v1/disbursements",
      "POST",
      payload,
      { "service-id": ISMART_SERVICE_IDS.disbursement }
    );
  }

  /**
   * Create a Bank disbursement
   */
  async createBankDisbursement(params: {
    reference: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    amount: number;
    narration: string;
    paymentMode?: string;
    currency?: string;
  }): Promise<ISmartFinancialResponse> {
    const payload: ISmartDisbursementRequest = {
      reference: params.reference,
      disburseType: "deposit",
      customer: {
        firstName: params.firstName,
        lastName: params.lastName,
        phoneNumber: params.phoneNumber,
      },
      provider: params.bankCode,
      narration: params.narration,
      channel: "BANK",
      amount: Number(params.amount),
      currency: params.currency || "GHS",
      source: "dashboard",
      paymentDetails: {
        accountNumber: params.accountNumber,
        accountName: params.accountName,
        bankCode: params.bankCode,
        paymentMode: params.paymentMode || "Other Bank (GIP-instant)",
        bankbranchCode: "",
      },
    };

    return this.request<ISmartFinancialResponse>(
      ISMART_DISBURSEMENT_SERVICE_URL,
      "/v1/disbursements",
      "POST",
      payload,
      { "service-id": ISMART_SERVICE_IDS.disbursement }
    );
  }

  /**
   * Create bulk disbursement
   */
  async createBulkDisbursement(params: {
    batchNumber: string;
    totalAmount: number;
    records: ISmartDisbursementRequest[];
  }): Promise<ISmartFinancialResponse> {
    const payload: ISmartBulkDisbursementRequest = {
      batchNumber: params.batchNumber,
      totalAmount: params.totalAmount.toString(),
      records: params.records,
    };

    return this.request<ISmartFinancialResponse>(
      ISMART_DISBURSEMENT_SERVICE_URL,
      "/v1/disbursements/bulk-v1",
      "POST",
      payload
    );
  }

  /**
   * Get disbursement history
   */
  async getDisbursementHistory(): Promise<ISmartFinancialResponse> {
    return this.request<ISmartFinancialResponse>(
      ISMART_AUTH_SERVICE_URL,
      "/auth/get-disbursements",
      "GET"
    );
  }

  /**
   * Wallet to Wallet transfer
   */
  async walletTransfer(params: {
    amount: number;
    recipientId: string;
    currency?: string;
    serviceId: string;
  }): Promise<ISmartFinancialResponse> {
    const payload: ISmartWalletTransferRequest = {
      amount: params.amount.toString(),
      recipientId: params.recipientId,
      currency: params.currency || "GHS",
    };

    return this.request<ISmartFinancialResponse>(
      ISMART_DISBURSEMENT_SERVICE_URL,
      "/v1/disbursements/wallet-transfer",
      "POST",
      payload,
      { "service-id": params.serviceId }
    );
  }

  // ============ Collections ============

  /**
   * Create Mobile Money collection (wallet top-up)
   */
  async createMoMoCollection(params: {
    referenceid: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    amount: number;
    provider: "MTN" | "TELECEL";
    paymentType?: "TOPUP" | "INVOICE";
    narration?: string;
    recipientId: string;
    currency?: string;
    items?: Array<{ description?: string; name?: string; quantity: number; unitPrice: string | number; total?: number }>;
  }): Promise<ISmartFinancialResponse> {
    const network = params.provider === "MTN" ? "mtn" : "telecel";
    
    const customer: ISmartCustomer = {
      firstName: params.firstName,
      lastName: params.lastName,
      phoneNumber: params.phoneNumber,
    };
    if (params.email) customer.email = params.email;




    // Spec payload (iSmartPay Wallet Funding): referenceid, paymentType, amount,
    // currency, narration, customer{firstName,lastName,phoneNumber,email,network}
    const payload: any = {
      referenceid: params.referenceid,
      paymentType: "topup",
      amount: params.amount.toFixed(2),
      currency: params.currency || "GHS",
      narration: params.narration || "Top Up Wallet",
      customer: {
        firstName: params.firstName,
        lastName: params.lastName,
        phoneNumber: params.phoneNumber,
        email: params.email || "test@ismartghana.com",
        network: params.provider.toLowerCase(),
      },
      callbackurl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/ismart-callback`,
    };

    if (params.items) {
      payload.items = params.items;
    }

    return this.request<ISmartFinancialResponse>(
      ISMART_COLLECTION_SERVICE_URL,
      "/momo-collection",
      "POST",
      payload,
      {
        "X-Skip-Auth": "1",
      }
    );

  }

  /**
   * Create Bank collection (wallet top-up via bank)
   */
  async createBankCollection(params: {
    referenceid: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    amount: number;
    provider: string; // bank code, e.g. "gcb", "ecobank"
    recipientId: string;
    currency?: string;
  }): Promise<ISmartFinancialResponse> {
    const payload = {
      referenceid: params.referenceid,
      paymentType: "topup",
      amount: params.amount.toFixed(2),
      currency: params.currency || "GHS",
      narration: "Top Up Wallet",
      customer: {
        firstName: params.firstName,
        lastName: params.lastName,
        phoneNumber: params.phoneNumber,
        // Bank collections require a real email address
        email: params.email || "test@ismartghana.com",
        network: String(params.provider).toLowerCase(),
      },
      callbackurl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/ismart-callback`,
    };

    return this.request<ISmartFinancialResponse>(
      ISMART_COLLECTION_SERVICE_URL,
      "/bank-collection",
      "POST",
      payload
    );

  }

  /**
   * Create a hosted iSmartPay Checkout session.
   * POST {collection}/ismartpaycheckout — returns a checkout URL to redirect to.
   */
  async createCheckoutSession(params: {
    referenceid: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    amount: number;
    network?: string;
    paymentType?: string;
    narration?: string;
    currency?: string;
    expirytime?: number; // seconds
    returnUrl?: string;
    items?: Array<{ description?: string; name?: string; quantity: number; unitPrice: string | number; total?: number }>;
  }): Promise<ISmartFinancialResponse> {
    const payload: Record<string, unknown> = {
      referenceid: params.referenceid,
      paymentType: params.paymentType || "topup",
      amount: params.amount.toFixed(2),
      currency: params.currency || "GHS",
      narration: params.narration || "Top Up Wallet",
      expirytime: params.expirytime ?? 1800,
      customer: {
        firstName: params.firstName,
        lastName: params.lastName,
        phoneNumber: params.phoneNumber,
        email: params.email || "test@ismartghana.com",
        network: (params.network || "mtn").toLowerCase(),
      },
      callbackurl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/ismart-callback`,
      // The hosted checkout endpoint rejects requests without returnurl and items.
      returnurl: params.returnUrl || `${Deno.env.get("SUPABASE_URL")}/functions/v1/ismart-callback`,
      items:
        params.items && params.items.length > 0
          ? params.items
          : [
              {
                name: params.narration || "Payment",
                description: params.narration || "Payment",
                quantity: 1,
                unitPrice: params.amount.toFixed(2),
                total: params.amount,
              },
            ],
    };


    return this.request<ISmartFinancialResponse>(
      ISMART_COLLECTION_SERVICE_URL,
      "/ismartpaycheckout",
      "POST",
      payload
    );
  }




  // ============ Status Check ============

  /**
   * Check the status of a collection/disbursement transaction.
   * GET {ISMART_STATUS_CHECK_URL}/status-check?referenceId=..&network=..&channel=..&apiId=..
   */
  async checkTransactionStatus(params: {
    referenceId: string;
    network: string; // MTN | TELECEL | AT | bank code
    channel?: string; // MOMO | BANK
    apiId?: string;
  }): Promise<ISmartFinancialResponse> {
    const apiId =
      params.apiId ||
      Deno.env.get("ISMART_STATUS_CHECK_API_ID") ||
      Deno.env.get("ISMART_API_ID") ||
      "192f3d8b6e61e1845dc2b83e72a3d3ba";
    const query = new URLSearchParams({
      referenceId: params.referenceId,
      network: (params.network || "mtn").toLowerCase(),
      channel: (params.channel || "mobile").toLowerCase() === "momo"
        ? "mobile"
        : (params.channel || "mobile").toLowerCase(),
      apiId,
    });
    console.log("[iSmart status-check] outgoing request:", JSON.stringify({
      endpoint: `${ISMART_STATUS_CHECK_URL}/status-check`,
      query: Object.fromEntries(query.entries()),
    }));

    return this.request<ISmartFinancialResponse>(
      ISMART_STATUS_CHECK_URL,
      `/status-check?${query.toString()}`,
      "GET",
      undefined,
      { "X-Skip-Auth": "1" }
    );
  }

  // ============ Wallet ============

  /**
   * Add funds to wallet (legacy endpoint)
   */
  async addFunds(params: { amount: number; currency?: string }): Promise<ISmartFinancialResponse> {
    return this.request<ISmartFinancialResponse>(
      ISMART_AUTH_SERVICE_URL,
      "/auth/add-funds",
      "POST",
      {
        amount: params.amount,
        currency: params.currency || "GHS",
      }
    );
  }

  /**
   * Get dashboard metrics (includes wallet balance)
   */
  async getDashboardMetrics(): Promise<ISmartFinancialResponse> {
    return this.request<ISmartFinancialResponse>(
      ISMART_AUTH_SERVICE_URL,
      "/auth/get-dashboard-metrics",
      "GET"
    );
  }

  /**
   * Search user by phone (for wallet transfers)
   */
  async searchUser(phoneNumber: string): Promise<ISmartFinancialResponse> {
    return this.request<ISmartFinancialResponse>(
      ISMART_AUTH_SERVICE_URL,
      "/publicauth/search-user",
      "POST",
      { phoneNumber },
      { "X-Skip-Auth": "1" }
    );
  }

  // ============ Settlements ============

  /**
   * Request settlement
   */
  async requestSettlement(params: {
    settlementType: "full" | "partial";
    amount?: number;
  }): Promise<ISmartFinancialResponse> {
    return this.request<ISmartFinancialResponse>(
      ISMART_DISBURSEMENT_SERVICE_URL,
      "/v1/settlements",
      "POST",
      {
        settlementType: params.settlementType,
        amount: params.amount,
      }
    );
  }

  /**
   * Get settlement report
   */
  async getSettlementReport(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ISmartFinancialResponse> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);
    
    const queryString = query.toString();
    return this.request<ISmartFinancialResponse>(
      ISMART_AUTH_SERVICE_URL,
      `/api/auth/settlements/report${queryString ? `?${queryString}` : ""}`,
      "GET"
    );
  }

  // ============ Fees ============

  /**
   * Check fees for a transaction
   */
  async checkFees(params: {
    amount: number;
    channel: "WALLET" | "MOBILE_MONEY" | "BANK";
    serviceId: string;
  }): Promise<ISmartFinancialResponse> {
    return this.request<ISmartFinancialResponse>(
      ISMART_AUTH_SERVICE_URL,
      "/feeChecker/checkfullpayable",
      "POST",
      {
        amount: params.amount.toString(),
        channel: params.channel,
        serviceId: params.serviceId,
      }
    );
  }
}

// Helper to generate unique reference IDs
export function generateReference(prefix: string = "TXN"): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Helper to generate UUID v4
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Helper to format phone number to Ghana format
export function formatGhanaPhone(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, "");
  
  // Remove leading zero if present
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  
  // Add Ghana country code if not present
  if (!cleaned.startsWith("233")) {
    cleaned = "233" + cleaned;
  }
  
  return cleaned;
}
