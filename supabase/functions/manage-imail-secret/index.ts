import { MerchantApiError, toErrorResponse } from "../_shared/merchant-api-client.ts";
import { requirePortalUser, serviceClient } from "../_shared/merchant-session.ts";
import { encryptPlatformSecret } from "../_shared/platform-secrets.ts";
import { validateIMailApiKey } from "../_shared/imail-client.ts";

const SECRET_NAME = "imail_api_key";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = serviceClient();
    const user = await requirePortalUser(req, supabase);
    const { data: isSuperAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (roleError || !isSuperAdmin) throw new MerchantApiError(403, "forbidden", "Super-admin access is required.");

    const { data: existing, error: readError } = await supabase
      .from("platform_secrets")
      .select("created_at, updated_at")
      .eq("secret_name", SECRET_NAME)
      .maybeSingle();
    if (readError) throw new MerchantApiError(503, "secret_store_unavailable", "Platform secret storage is unavailable.");

    if (req.method === "GET") {
      return json({
        configured: Boolean(Deno.env.get("IMAIL_API_KEY") || existing),
        source: Deno.env.get("IMAIL_API_KEY") ? "environment" : existing ? "encrypted_store" : null,
        updatedAt: existing?.updated_at || null,
      });
    }

    if (Deno.env.get("IMAIL_API_KEY") && (req.method === "PUT" || req.method === "DELETE")) {
      throw new MerchantApiError(409, "environment_override", "The server environment currently overrides the stored iMail key.");
    }

    if (req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const submittedKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      if (submittedKey.length < 16 || submittedKey.length > 512) {
        throw new MerchantApiError(400, "invalid_key", "Enter a valid iMail API key.");
      }
      const validation = await validateIMailApiKey(submittedKey);
      if (!validation.valid) {
        throw new MerchantApiError(400, "invalid_key", "iMail rejected this API key. Check the key and try again.");
      }
      const encrypted = await encryptPlatformSecret(submittedKey);
      const now = new Date().toISOString();
      const secretRecord: Record<string, unknown> = {
        secret_name: SECRET_NAME,
        ciphertext: encrypted.ciphertext,
        initialization_vector: encrypted.initializationVector,
        key_version: 1,
        updated_by: user.id,
        updated_at: now,
      };
      if (!existing) secretRecord.created_by = user.id;
      const { error } = await supabase.from("platform_secrets").upsert(secretRecord);
      if (error) throw new MerchantApiError(503, "secret_store_unavailable", "The iMail key could not be saved.");
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: existing ? "rotate_platform_secret" : "create_platform_secret",
        entity_type: "platform_secret",
        metadata: { secret_name: SECRET_NAME },
      });
      if (auditError) throw new MerchantApiError(503, "audit_unavailable", "The key was saved, but its required audit record could not be created. Do not rotate it again until auditing is restored.");
      return json({ configured: true, source: "encrypted_store", updatedAt: now });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase.from("platform_secrets").delete().eq("secret_name", SECRET_NAME);
      if (error) throw new MerchantApiError(503, "secret_store_unavailable", "The iMail key could not be removed.");
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "delete_platform_secret",
        entity_type: "platform_secret",
        metadata: { secret_name: SECRET_NAME },
      });
      if (auditError) throw new MerchantApiError(503, "audit_unavailable", "The key was removed, but its required audit record could not be created.");
      return json({ configured: false, source: null, updatedAt: null });
    }

    if (req.method === "POST") {
      const validation = await validateIMailApiKey();
      if (!validation.valid) throw new MerchantApiError(400, "invalid_key", "The configured iMail API key was rejected and must be rotated.");
      return json({ success: true, message: "iMail authentication succeeded." });
    }

    throw new MerchantApiError(405, "method_not_allowed", "Method not allowed.");
  } catch (error) {
    console.error("iMail secret management failed", error instanceof Error ? error.name : "unknown_error");
    return toErrorResponse(error, corsHeaders);
  }
});
