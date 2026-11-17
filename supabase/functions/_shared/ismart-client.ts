// iSmart API Client - Shared module for all communication functions
// SMS Base URL: https://smsismartghana.com/api/SendSms

export const ISMART_BASE_URL = "https://smsismartghana.com";
export const ISMART_SMS_ENDPOINT = "https://smsismartghana.com/api/SendSms";

export interface ISmartSMSRequest {
  to: string;
  message: string;
  sender_id?: string;
}

export interface ISmartBulkSMSRequest {
  recipients: Array<{ phone: string; message: string }>;
  sender_id?: string;
}

export interface ISmartWhatsAppRequest {
  to: string;
  message: string;
  template_id?: string;
  variables?: Record<string, string>;
}

export interface ISmartEmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
  from_name?: string;
}

export interface ISmartBulkEmailRequest {
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
  from?: string;
  from_name?: string;
}

export interface ISmartResponse {
  success: boolean;
  message_id?: string;
  batch_id?: string;
  error?: string;
  code?: string;
}

export class ISmartClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = ISMART_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || `API error: ${response.status}`);
    }

    return result;
  }

  async sendSMS(params: ISmartSMSRequest): Promise<ISmartResponse> {
    return this.request<ISmartResponse>("/sms/send", {
      phone: params.to,
      message: params.message,
      sender_id: params.sender_id || "iSmartPay",
    });
  }

  async sendBulkSMS(params: ISmartBulkSMSRequest): Promise<ISmartResponse> {
    return this.request<ISmartResponse>("/sms/bulk", {
      messages: params.recipients.map((r) => ({
        phone: r.phone,
        message: r.message,
      })),
      sender_id: params.sender_id || "iSmartPay",
    });
  }

  async sendWhatsApp(params: ISmartWhatsAppRequest): Promise<ISmartResponse> {
    return this.request<ISmartResponse>("/whatsapp/send", {
      phone: params.to,
      message: params.message,
      template_id: params.template_id,
      variables: params.variables,
    });
  }

  async sendEmail(params: ISmartEmailRequest): Promise<ISmartResponse> {
    return this.request<ISmartResponse>("/email/send", {
      to: params.to,
      subject: params.subject,
      html: params.html,
      from: params.from || "noreply@ismartpay.com",
      from_name: params.from_name || "iSmartPay",
    });
  }

  async sendBulkEmail(params: ISmartBulkEmailRequest): Promise<ISmartResponse> {
    return this.request<ISmartResponse>("/email/bulk", {
      recipients: params.recipients,
      subject: params.subject,
      html: params.html,
      from: params.from || "noreply@ismartpay.com",
      from_name: params.from_name || "iSmartPay",
    });
  }

  // Test connection by making a lightweight API call
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "X-API-Key": this.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Helper to get API key from system_settings
export async function getISmartApiKey(supabase: any): Promise<string | null> {
  try {
    const { getPlatformSecret } = await import("./platform-secrets.ts");
    const encrypted = await getPlatformSecret(supabase, "integration:ismart:ismart_api_key");
    if (encrypted) return encrypted;
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "secret_ismart_ismart_api_key")
      .single();

    if (data?.setting_value) {
      // Decode from base64
      return atob(data.setting_value);
    }
    return null;
  } catch (error) {
    console.error("Error fetching iSmart API key:", error);
    return null;
  }
}
