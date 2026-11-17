import { aiCorsHeaders, aiErrorResponse, aiJson, callGemini, requireAiUser } from "../_shared/gemini.ts";
import { encryptPlatformSecret } from "../_shared/platform-secrets.ts";

const SECRET_NAME = "gemini_api_key";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: aiCorsHeaders });

  try {
    const { supabase, user } = await requireAiUser(req);
    const { data: isSuperAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (roleError || !isSuperAdmin) return aiJson({ error: { code: "forbidden", message: "Super-admin access is required." } }, 403);

    const { data: existing, error: readError } = await supabase
      .from("platform_secrets")
      .select("created_at, updated_at")
      .eq("secret_name", SECRET_NAME)
      .maybeSingle();
    if (readError) throw readError;

    if (req.method === "GET") {
      return aiJson({ configured: Boolean(Deno.env.get("GEMINI_API_KEY") || existing), source: Deno.env.get("GEMINI_API_KEY") ? "environment" : existing ? "encrypted_store" : null, updatedAt: existing?.updated_at || null });
    }

    if (Deno.env.get("GEMINI_API_KEY")) return aiJson({ error: { code: "environment_override", message: "The server environment currently overrides the stored Gemini key." } }, 409);

    if (req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      if (apiKey.length < 20 || apiKey.length > 512) return aiJson({ error: { code: "invalid_key", message: "Enter a valid Gemini API key." } }, 400);
      const encrypted = await encryptPlatformSecret(apiKey);
      const now = new Date().toISOString();
      const { error } = await supabase.from("platform_secrets").upsert({
        secret_name: SECRET_NAME,
        ciphertext: encrypted.ciphertext,
        initialization_vector: encrypted.initializationVector,
        key_version: 1,
        created_by: existing ? undefined : user.id,
        updated_by: user.id,
        updated_at: now,
      });
      if (error) throw error;
      const { error: auditError } = await supabase.from("audit_logs").insert({ user_id: user.id, action_type: existing ? "rotate_platform_secret" : "create_platform_secret", entity_type: "platform_secret", metadata: { secret_name: SECRET_NAME } });
      if (auditError) throw new Error("Required secret audit record could not be created");
      return aiJson({ configured: true, source: "encrypted_store", updatedAt: now });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase.from("platform_secrets").delete().eq("secret_name", SECRET_NAME);
      if (error) throw error;
      const { error: auditError } = await supabase.from("audit_logs").insert({ user_id: user.id, action_type: "delete_platform_secret", entity_type: "platform_secret", metadata: { secret_name: SECRET_NAME } });
      if (auditError) throw new Error("Required secret audit record could not be created");
      return aiJson({ configured: false, source: null, updatedAt: null });
    }

    if (req.method === "POST") {
      await callGemini(Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-3.5-flash", { contents: [{ parts: [{ text: "Reply with OK." }] }], generationConfig: { maxOutputTokens: 8 } }, supabase);
      const { error: auditError } = await supabase.from("audit_logs").insert({ user_id: user.id, action_type: "test_platform_secret", entity_type: "platform_secret", metadata: { secret_name: SECRET_NAME, success: true } });
      if (auditError) throw new Error("Required secret audit record could not be created");
      return aiJson({ success: true });
    }

    return aiJson({ error: { code: "method_not_allowed", message: "Method not allowed." } }, 405);
  } catch (error) {
    console.error("AI secret management failed", error instanceof Error ? error.name : "unknown_error");
    return aiErrorResponse(error);
  }
});
