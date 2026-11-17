import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { aiCorsHeaders, aiErrorResponse, aiJson, callGemini, requireAiUser, responseImage, uploadGeneratedImage } from "../_shared/gemini.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: aiCorsHeaders });
  if (req.method !== "POST") return aiJson({ error: { code: "method_not_allowed", message: "method not allowed" } }, 405);
  try {
    const { supabase, user } = await requireAiUser(req);
    const { prompt, aspectRatio = "1:1" } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim()) return aiJson({ error: { code: "invalid_input", message: "Prompt is required" } }, 400);
    if (prompt.length > 1_000) return aiJson({ error: { code: "invalid_input", message: "Prompt is too long" } }, 400);
    const response = await callGemini(Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-3.1-flash-image", {
      contents: [{ parts: [{ text: `Create a professional commercial product photograph on a clean white background. ${prompt.trim()}. No text, watermarks, or logos. Aspect ratio ${aspectRatio}.` }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    });
    const imageUrl = await uploadGeneratedImage(supabase, user.id, responseImage(response));
    return aiJson({ imageUrl });
  } catch (error) {
    return aiErrorResponse(error);
  }
});
