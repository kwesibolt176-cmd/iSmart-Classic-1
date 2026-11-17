import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { MerchantApiError, refreshMerchantSession } from "./merchant-api-client.ts";
import { decryptSessionToken, encryptSessionToken, sessionEncryptionSecret } from "./session-crypto.ts";

export type MerchantSessionRecord = {
  user_id: string;
  merchant_principal_id: string;
  business_id: string | null;
  access_token: string;
  refresh_token: string;
};

export const serviceClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const requirePortalUser = async (req: Request, supabase: SupabaseClient): Promise<User> => {
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) throw new MerchantApiError(401, "unauthenticated", "authentication required");
  const { data, error } = await supabase.auth.getUser(bearer);
  if (error || !data.user) throw new MerchantApiError(401, "unauthenticated", "authentication required");
  return data.user;
};

export const getMerchantSession = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<MerchantSessionRecord> => {
  const { data, error } = await supabase.from("merchant_api_sessions")
    .select("user_id,merchant_principal_id,business_id,access_token,refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new MerchantApiError(401, "merchant_session_missing", "Merchant API session is missing");
  const stored = data as MerchantSessionRecord;
  const secret = sessionEncryptionSecret();
  let decrypted: MerchantSessionRecord;
  try {
    decrypted = {
      ...stored,
      access_token: await decryptSessionToken(stored.access_token, secret),
      refresh_token: await decryptSessionToken(stored.refresh_token, secret),
    };
  } catch {
    await supabase.from("merchant_api_sessions").delete().eq("user_id", userId);
    throw new MerchantApiError(401, "merchant_session_expired", "Your iSmart session has expired. Please sign in again.");
  }
  if (!stored.access_token.startsWith("v1.") || !stored.refresh_token.startsWith("v1.")) {
    const { error: migrationError } = await supabase.from("merchant_api_sessions").update({
      access_token: await encryptSessionToken(decrypted.access_token, secret),
      refresh_token: await encryptSessionToken(decrypted.refresh_token, secret),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    if (migrationError) {
      throw new MerchantApiError(503, "merchant_session_store_unavailable", "The sign-in service is temporarily unavailable.");
    }
  }
  return decrypted;
};

export const refreshStoredMerchantSession = async (
  supabase: SupabaseClient,
  session: MerchantSessionRecord,
) => {
  let refreshed;
  try {
    refreshed = await refreshMerchantSession(session.refresh_token);
  } catch (error) {
    if (error instanceof MerchantApiError && [400, 401, 403].includes(error.status)) {
      await supabase.from("merchant_api_sessions").delete().eq("user_id", session.user_id);
      throw new MerchantApiError(401, "merchant_session_expired", "Your iSmart session has expired. Please sign in again.");
    }
    throw error;
  }
  const secret = sessionEncryptionSecret();
  const { error: updateError } = await supabase.from("merchant_api_sessions").update({
    access_token: await encryptSessionToken(refreshed.tokens.access_token, secret),
    refresh_token: await encryptSessionToken(refreshed.tokens.refresh_token, secret),
    access_expires_at: refreshed.tokens.expires_at || null,
    merchant_session_id: refreshed.tokens.session_id || null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", session.user_id);
  if (updateError) throw new MerchantApiError(503, "merchant_session_store_unavailable", "The sign-in service is temporarily unavailable.");
  return { ...session, access_token: refreshed.tokens.access_token, refresh_token: refreshed.tokens.refresh_token };
};

export const merchantRequestWithSessionRefresh = async <T>(
  supabase: SupabaseClient,
  session: MerchantSessionRecord,
  request: (accessToken: string) => Promise<T>,
): Promise<T> => {
  try {
    return await request(session.access_token);
  } catch (error) {
    if (!(error instanceof MerchantApiError) || error.status !== 401) throw error;
    const refreshed = await refreshStoredMerchantSession(supabase, session);
    return request(refreshed.access_token);
  }
};
