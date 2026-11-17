import { joinMerchantApiUrl } from "./merchant-api-url.ts";

export const MERCHANT_API_BASE_URL =
  Deno.env.get("ISMART_MERCHANT_API_URL") || "https://merchant.ismartghana.com/api";

export const merchantApiUrl = (path: string) => joinMerchantApiUrl(MERCHANT_API_BASE_URL, path);

export interface MerchantTokens {
  access_token: string;
  refresh_token: string;
  expires_at?: string;
  expires_in?: number;
  session_id?: string;
  token_type?: string;
}

export interface MerchantPrincipal {
  id: string;
  business_id?: string;
  email?: string;
  phone?: string;
  full_name?: string;
  account_type: string;
  status: string;
  role?: string;
}

export interface MerchantSessionResponse {
  principal: MerchantPrincipal;
  tokens: MerchantTokens;
}

export class MerchantApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

const safeJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const merchantRequest = async <T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    accessToken?: string;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    idempotencyKey?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<T> => {
  const url = merchantApiUrl(path);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await safeJson(response);
  if (!response.ok) {
    const envelope = payload as { error?: { code?: string; message?: string } } | null;
    throw new MerchantApiError(
      response.status,
      envelope?.error?.code || `http_${response.status}`,
      envelope?.error?.message || "Merchant API request failed",
      response.headers.get("x-request-id") || undefined,
    );
  }
  return payload as T;
};

export const refreshMerchantSession = (refreshToken: string) =>
  merchantRequest<MerchantSessionResponse>("/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });

export const toErrorResponse = (error: unknown, corsHeaders: Record<string, string>) => {
  const status = error instanceof MerchantApiError ? error.status : 500;
  const code = error instanceof MerchantApiError ? error.code : "internal";
  const message = error instanceof MerchantApiError ? error.message : "internal server error";
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};
