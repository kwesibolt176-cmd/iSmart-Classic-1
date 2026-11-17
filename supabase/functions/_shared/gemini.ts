import { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { MerchantApiError } from "./merchant-api-client.ts";
import { requirePortalUser, serviceClient } from "./merchant-session.ts";
import { getPlatformSecret } from "./platform-secrets.ts";
import { publicAppUrl } from "./public-app-url.ts";

export const aiCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
};

type GeminiPart = { text?: string; inlineData?: { data?: string; mimeType?: string } };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  promptFeedback?: { blockReason?: string };
};

export const aiJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...aiCorsHeaders, "Content-Type": "application/json" },
});

export const requireAiUser = async (req: Request): Promise<{ supabase: SupabaseClient; user: User }> => {
  const supabase = serviceClient();
  return { supabase, user: await requirePortalUser(req, supabase) };
};

const geminiKey = async (supabase: SupabaseClient) => {
  const key = Deno.env.get("GEMINI_API_KEY") || await getPlatformSecret(supabase, "gemini_api_key");
  if (!key) throw new MerchantApiError(503, "ai_not_configured", "AI image tools are temporarily unavailable.");
  return key;
};

export const callGemini = async (model: string, body: Record<string, unknown>, supabase = serviceClient()): Promise<GeminiResponse> => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": await geminiKey(supabase), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429) throw new MerchantApiError(429, "ai_rate_limited", "AI generation is busy. Please try again shortly.");
    if (response.status === 400) throw new MerchantApiError(400, "ai_request_rejected", "Gemini could not process this request.");
    if ([401, 403].includes(response.status)) throw new MerchantApiError(503, "ai_provider_unavailable", "AI image tools are temporarily unavailable.");
    throw new MerchantApiError(502, "ai_provider_error", "Gemini did not complete the request.");
  }
  return await response.json() as GeminiResponse;
};

export const responseParts = (response: GeminiResponse) => response.candidates?.[0]?.content?.parts || [];

export const responseImage = (response: GeminiResponse) => {
  const image = responseParts(response).find((part) => part.inlineData?.data)?.inlineData;
  if (!image?.data) {
    const blocked = response.promptFeedback?.blockReason;
    throw new MerchantApiError(blocked ? 400 : 502, blocked ? "ai_prompt_blocked" : "ai_image_missing", blocked ? "Gemini could not generate an image from that prompt." : "Gemini returned no image.");
  }
  return { data: image.data, mimeType: image.mimeType || "image/png" };
};

export const uploadGeneratedImage = async (supabase: SupabaseClient, userId: string, image: { data: string; mimeType: string }) => {
  const bytes = Uint8Array.from(atob(image.data), (character) => character.charCodeAt(0));
  if (bytes.byteLength > 10 * 1024 * 1024) throw new MerchantApiError(502, "ai_image_too_large", "The generated image was too large to save.");
  const extension = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType === "image/webp" ? "webp" : "png";
  const path = `${userId}/ai/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-images").upload(path, bytes, { contentType: image.mimeType, cacheControl: "31536000", upsert: false });
  if (error) throw new MerchantApiError(503, "image_storage_failed", "The generated image could not be saved.");
  // getPublicUrl() on the service client uses the internal SUPABASE_URL (e.g. http://kong:8000),
  // which browsers cannot load; return the public storage URL instead.
  return `${publicStorageBase()}${PRODUCT_IMAGE_PUBLIC_PATH}${path}`;
};

const PRODUCT_IMAGE_PUBLIC_PATH = "/storage/v1/object/public/product-images/";

const internalStorageBase = () => (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");

/** Public base URL of the storage API, as browsers see it. */
const publicStorageBase = () =>
  (Deno.env.get("SUPABASE_PUBLIC_URL") || Deno.env.get("API_EXTERNAL_URL") || publicAppUrl()).replace(/\/+$/, "");

const publicStorageHosts = () =>
  [Deno.env.get("SUPABASE_PUBLIC_URL"), Deno.env.get("API_EXTERNAL_URL"), publicAppUrl()]
    .filter((value): value is string => Boolean(value))
    .map((value) => { try { return new URL(value).hostname; } catch { return ""; } })
    .filter(Boolean);

const decodeDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
};

export const loadProductImage = async (imageUrl: string) => {
  const inline = decodeDataUrl(imageUrl);
  if (inline) {
    if (inline.data.length > 7 * 1024 * 1024) throw new MerchantApiError(400, "image_too_large", "Image size must be below 5MB.");
    return inline;
  }
  const url = new URL(imageUrl);
  const storageHost = new URL(Deno.env.get("SUPABASE_URL") || "http://invalid.local").hostname;
  const extraHosts = (Deno.env.get("AI_IMAGE_ALLOWED_HOSTS") || "").split(",").map((host) => host.trim()).filter(Boolean);
  const isOwnProductImage = url.protocol === "https:" && publicStorageHosts().includes(url.hostname) &&
    url.pathname.startsWith(PRODUCT_IMAGE_PUBLIC_PATH) && !url.pathname.includes("..");
  if (!isOwnProductImage && (url.protocol !== "https:" || ![storageHost, ...extraHosts].includes(url.hostname))) {
    throw new MerchantApiError(400, "image_host_not_allowed", "This image is not from your product uploads. Upload it again to use AI tools.");
  }
  // Images uploaded through the portal carry its public URL. Read them through the
  // internal storage address so the container does not loop back through the public proxy.
  const fetchUrl = isOwnProductImage && internalStorageBase() ? `${internalStorageBase()}${url.pathname}` : url.toString();
  const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(15_000), redirect: "error" });
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "";
  if (!response.ok || !["image/png", "image/jpeg", "image/webp"].includes(mimeType)) throw new MerchantApiError(400, "invalid_image", "The product image could not be read.");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 5 * 1024 * 1024) throw new MerchantApiError(400, "image_too_large", "Image size must be below 5MB.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 5 * 1024 * 1024) throw new MerchantApiError(400, "image_too_large", "Image size must be below 5MB.");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { mimeType, data: btoa(binary) };
};

export const aiErrorResponse = (error: unknown) => {
  if (error instanceof MerchantApiError) return aiJson({ error: { code: error.code, message: error.message } }, error.status);
  if (error instanceof DOMException && error.name === "TimeoutError") return aiJson({ error: { code: "ai_timeout", message: "The AI request timed out. Please try again." } }, 504);
  return aiJson({ error: { code: "internal", message: "AI image processing failed." } }, 500);
};
