export type VerificationProofPayload = {
  purpose: "financial_destination";
  userId: string;
  businessId: string;
  merchantBusinessId: string;
  channel: "mobile";
  provider: string;
  destination: string;
  accountName: string;
  expiresAt: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const base64UrlDecode = (value: string) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const signingKey = (secret: string, usage: KeyUsage) => crypto.subtle.importKey(
  "raw",
  encoder.encode(`financial-verification:v1:${secret}`),
  { name: "HMAC", hash: "SHA-256" },
  false,
  [usage],
);

export const issueVerificationProof = async (payload: VerificationProofPayload, secret: string) => {
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret, "sign"), encoder.encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
};

export const readVerificationProof = async (token: string, secret: string): Promise<VerificationProofPayload | null> => {
  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (!encodedPayload || !encodedSignature || extra) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret, "verify"),
      base64UrlDecode(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(base64UrlDecode(encodedPayload))) as VerificationProofPayload;
    if (payload.purpose !== "financial_destination" || !Number.isFinite(payload.expiresAt) || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

export const normalizeVerifiedMsisdn = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("233")) return `+${digits}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  return `+233${digits}`;
};

// payment-processor expects an E.164 MSISDN without the leading plus sign.
// Keep the signed proof value canonical (+233...) and convert only at the
// Merchant API boundary.
export const toMerchantMsisdn = (value: unknown) => normalizeVerifiedMsisdn(value).slice(1);
