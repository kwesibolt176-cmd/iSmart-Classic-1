const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PREFIX = "v1";

const encode = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const decode = (value: string) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const key = async (secret: string, usage: KeyUsage) => {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`merchant-session:v1:${secret}`));
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, [usage]);
};

export const encryptSessionToken = async (token: string, secret: string) => {
  if (token.startsWith(`${PREFIX}.`)) return token;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(secret, "encrypt"), encoder.encode(token));
  return `${PREFIX}.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
};

export const decryptSessionToken = async (stored: string, secret: string) => {
  if (!stored.startsWith(`${PREFIX}.`)) return stored;
  const [version, encodedIv, encodedCiphertext, extra] = stored.split(".");
  if (version !== PREFIX || !encodedIv || !encodedCiphertext || extra) throw new Error("invalid encrypted session token");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(encodedIv) },
    await key(secret, "decrypt"),
    decode(encodedCiphertext),
  );
  return decoder.decode(plaintext);
};

export const sessionEncryptionSecret = () => {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("session encryption is unavailable");
  return secret;
};
