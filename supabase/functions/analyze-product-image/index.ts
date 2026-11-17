import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { aiCorsHeaders, aiErrorResponse, aiJson, callGemini, loadProductImage, requireAiUser, responseParts } from "../_shared/gemini.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: aiCorsHeaders });
  if (req.method !== "POST") return aiJson({ error: { code: "method_not_allowed", message: "method not allowed" } }, 405);
  try {
    await requireAiUser(req);
    const { imageUrl, mode = "categorize", categories = [] } = await req.json();
    if (typeof imageUrl !== "string" || !imageUrl) return aiJson({ error: { code: "invalid_input", message: "Image URL is required" } }, 400);
    const image = await loadProductImage(imageUrl);
    const safeCategories = Array.isArray(categories) ? categories.filter((value) => typeof value === "string").slice(0, 100) : [];
    const prompt = mode === "search"
      ? "Describe this product for visual search. Include type, color, material, style, key features, and visible text."
      : `Identify this product and match it to one of these categories when possible: ${safeCategories.join(", ") || "none provided"}. Return only JSON with string fields productName, category, and description.`;
    const response = await callGemini(Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-3.5-flash", {
      contents: [{ parts: [{ text: prompt }, { inlineData: image }] }],
      ...(mode === "search" ? {} : { generationConfig: { responseMimeType: "application/json" } }),
    });
    const raw = responseParts(response).map((part) => part.text || "").join("").trim();
    if (!raw) return aiJson({ error: { code: "ai_analysis_missing", message: "Gemini returned no analysis." } }, 502);
    if (mode === "search") return aiJson({ analysis: raw, raw });
    try {
      return aiJson({ analysis: JSON.parse(raw), raw });
    } catch {
      return aiJson({ error: { code: "ai_analysis_invalid", message: "Gemini returned an invalid analysis." } }, 502);
    }
  } catch (error) {
    return aiErrorResponse(error);
  }
});
