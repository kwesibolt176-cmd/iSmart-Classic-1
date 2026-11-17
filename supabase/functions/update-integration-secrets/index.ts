import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptPlatformSecret } from "../_shared/platform-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateSecretsRequest {
  integrationId: string;
  secrets: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with the user's token to verify identity
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is a super admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: hasRole } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });

    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { integrationId, secrets }: UpdateSecretsRequest = await req.json();

    if (!integrationId || !secrets || Object.keys(secrets).length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: integrationId and secrets required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!/^[a-z0-9_-]{2,64}$/i.test(integrationId)) {
      return new Response(JSON.stringify({ error: "Invalid integration identifier" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    for (const [key, value] of Object.entries(secrets)) {
      if (value && value.trim()) {
        if (!/^[a-z0-9_-]{2,64}$/i.test(key) || value.length > 4096) throw new Error("Invalid secret field");
        const encrypted = await encryptPlatformSecret(value.trim());
        const { error: secretError } = await adminClient.from("platform_secrets").upsert({
          secret_name: `integration:${integrationId}:${key.toLowerCase()}`,
          ciphertext: encrypted.ciphertext,
          initialization_vector: encrypted.initializationVector,
          key_version: 1,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
        if (secretError) throw new Error("Encrypted secret storage is unavailable");
      }
    }

    // Log the action
    const { error: auditError } = await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action_type: "update_integration_secrets",
      entity_type: "integration",
      entity_id: integrationId,
      metadata: {
        keys_updated: Object.keys(secrets).filter(k => secrets[k]?.trim()),
      },
    });
    if (auditError) throw new Error("Required integration audit record could not be created");

    return new Response(
      JSON.stringify({ success: true, message: "Secrets updated successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error updating integration secrets:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
