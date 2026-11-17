import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { aiCorsHeaders, aiErrorResponse, aiJson, callGemini, loadProductImage, requireAiUser, responseImage, uploadGeneratedImage } from "../_shared/gemini.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: aiCorsHeaders });
  if (req.method !== "POST") return aiJson({ error: { code: "method_not_allowed", message: "method not allowed" } }, 405);
  try {
    const { supabase, user } = await requireAiUser(req);
    const { imageUrl } = await req.json();
    if (typeof imageUrl !== "string" || !imageUrl) return aiJson({ error: { code: "invalid_input", message: "Image URL is required" } }, 400);
    const image = await loadProductImage(imageUrl);
    const response = await callGemini(Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-3.1-flash-image", {
      contents: [{ parts: [
        { text: "Polish this product photograph. Preserve the product faithfully, use a clean white background, and improve lighting, contrast, color accuracy, and sharpness. Do not add text, watermarks, logos, or new objects." },
        { inlineData: image },
      ] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    });
    const polishedImageUrl = await uploadGeneratedImage(supabase, user.id, responseImage(response));
    return aiJson({ polishedImageUrl });
  } catch (error) {
    return aiErrorResponse(error);
  }
});
