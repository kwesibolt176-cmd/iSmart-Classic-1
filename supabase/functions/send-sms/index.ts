import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendIMailMessage, validateIMailApiKey } from "../_shared/imail-client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string;
  message: string;
  type?: "payment_link" | "receipt" | "campaign" | "notification" | "otp";
  channel?: "sms" | "whatsapp";
  sender_id?: string;
  skipCreditCheck?: boolean;
  test?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", serviceKey);
    let actorId: string | null = null;
    if (!token) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (token !== serviceKey) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      actorId = data.user.id;
    }
    const body = await req.json();

    if (body.test === true) {
      const validation = await validateIMailApiKey();
      return new Response(
        JSON.stringify(validation.valid
          ? { success: true, message: "iMail SMS authentication succeeded" }
          : { success: false, error: "The configured iMail API key was rejected", code: "INVALID_API_KEY" }),
        { status: validation.valid ? 200 : 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message, type }: SMSRequest = body;
    if (!to || !message) throw new Error("Missing required fields: to, message");
    const normalizedPhone = String(to).replace(/[^0-9+]/g, "");
    if (!/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) throw new Error("Invalid recipient phone number");
    if (message.length > 1_600) throw new Error("SMS content exceeds the allowed size");

    const notification_type = (type === "otp" || type === "receipt" || type === "campaign" || type === "payment_link")
      ? type
      : "notification";

    const result = await sendIMailMessage({
      channel: "sms",
      recipient: normalizedPhone,
      message,
      notification_type,
      message_form: "plain",
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: (result.body && (result.body.error || result.body.message)) || "Failed to send SMS",
          code: "API_ERROR",
          status: result.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: actorId, action_type: "send_sms", entity_type: "notification",
      metadata: { provider: "imail", notification_type },
    });
    if (auditError) throw new Error("SMS sent but its required audit record could not be created");

    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.body?.message_id || result.body?.id,
        message: "SMS sent successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-sms:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
