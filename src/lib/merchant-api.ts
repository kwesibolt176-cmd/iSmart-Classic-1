import { supabase } from "@/integrations/supabase/client";
export { createIdempotencyKey, merchantBusinessPath } from "./merchant-api-utils";

export type MerchantApiInput = {
  path?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  idempotencyKey?: string;
};

export class MerchantApiClientError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export const callMerchantApi = async <T>(operation: string, input: MerchantApiInput = {}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("merchant-api", {
    body: { operation, ...input },
  });
  if (error) {
    let code = "merchant_api_error";
    let message = error.message;
    try {
      const payload = await error.context?.json?.();
      code = payload?.error?.code || code;
      message = payload?.error?.message || message;
    } catch {
      // Preserve the transport error when the body is not JSON.
    }
    throw new MerchantApiClientError(code, message);
  }
  return data as T;
};
