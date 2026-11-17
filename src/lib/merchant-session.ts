import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/function-errors";

const MERCHANT_CLIENT_KEYS = [
  "ismart_access_token",
  "ismart_refresh_token",
  "ismart_user_id",
  "ismart_user_data",
  "ismart_email",
  "ismart_business_id",
  "ismart_recipient_id",
  "cached_business_profile",
  "cached_feature_settings",
];

const REAUTH_CODES = new Set([
  "unauthenticated",
  "merchant_session_missing",
  "merchant_session_expired",
  "merchant_session_mismatch",
]);

type MerchantSessionPayload = {
  success?: boolean;
  error?: { code?: string; message?: string };
};

export class MerchantSessionValidationError extends Error {
  requiresSignIn: boolean;

  constructor(message: string, requiresSignIn: boolean) {
    super(message);
    this.name = "MerchantSessionValidationError";
    this.requiresSignIn = requiresSignIn;
  }
}

export const clearMerchantClientState = () => {
  MERCHANT_CLIENT_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const validateMerchantPortalSession = async () => {
  const { data, error } = await supabase.functions.invoke<MerchantSessionPayload>("merchant-auth", {
    body: { action: "session" },
  });
  if (!error && data?.success) return;

  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  const code = data?.error?.code;
  const message = await functionErrorMessage(error, data, "Could not verify the iSmart session.");
  throw new MerchantSessionValidationError(message, status === 401 || REAUTH_CODES.has(code || ""));
};

export const signOutMerchantPortal = async () => {
  try {
    await supabase.functions.invoke("merchant-auth", { body: { action: "logout" } });
  } finally {
    clearMerchantClientState();
    await supabase.auth.signOut();
  }
};
