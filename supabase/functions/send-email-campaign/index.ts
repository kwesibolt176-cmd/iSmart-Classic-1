import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendIMailMessage } from "../_shared/imail-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailCampaignRequest {
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
  from?: string;
  from_name?: string;
  campaign_id?: string;
  test?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailCampaignRequest = await req.json();

    if (body.test === true) {
      return new Response(
        JSON.stringify({ success: true, message: "iMail Email Campaign endpoint reachable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipients, subject, html } = body;
    if (!recipients || recipients.length === 0) throw new Error("No recipients provided");
    if (!subject || !html) throw new Error("Missing required fields: subject, html");

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const BATCH = 25;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const slice = recipients.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map((r) =>
          sendIMailMessage({
            channel: "email",
            recipient: r.email,
            message: html,
            subject,
            notification_type: "campaign",
            message_form: "html",
          }).catch((e) => ({ ok: false, status: 0, body: { error: String(e) } }))
        )
      );
      for (const res of results) {
        if (res.ok) successCount++;
        else {
          failedCount++;
          if (res.body?.error || res.body?.message) errors.push(String(res.body.error || res.body.message));
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        successCount,
        failedCount,
        errors: errors.slice(0, 5),
        message: `Email campaign sent: ${successCount} ok, ${failedCount} failed`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-email-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
