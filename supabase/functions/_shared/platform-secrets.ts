import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { MerchantApiError } from "./merchant-api-client.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const encryptionKey = async () => {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) throw new MerchantApiError(503, "secret_store_unavailable", "Platform secret storage is unavailable.");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`classic-portal:platform-secrets:v1:${serviceRoleKey}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
};

export const encryptPlatformSecret = async (value: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), encoder.encode(value));
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), initializationVector: bytesToBase64(iv) };
};

export const decryptPlatformSecret = async (ciphertext: string, initializationVector: string) => {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(initializationVector) },
      await encryptionKey(),
      base64ToBytes(ciphertext),
    );
    return decoder.decode(plaintext);
  } catch {
    throw new MerchantApiError(503, "secret_decryption_failed", "The configured platform secret must be rotated.");
  }
};

export const getPlatformSecret = async (supabase: SupabaseClient, secretName: string) => {
  const { data, error } = await supabase
    .from("platform_secrets")
    .select("ciphertext, initialization_vector")
    .eq("secret_name", secretName)
    .maybeSingle();
  if (error) throw new MerchantApiError(503, "secret_store_unavailable", "Platform secret storage is unavailable.");
  if (!data) return null;
  return decryptPlatformSecret(data.ciphertext, data.initialization_vector);
};

