import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendIMailMessage } from "../_shared/imail-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkSMSRequest {
  recipients: Array<{ phone: string; message: string }>;
  sender_id?: string;
  campaign_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients }: BulkSMSRequest = await req.json();
    if (!recipients || recipients.length === 0) throw new Error("No recipients provided");

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Fan out concurrently but in batches to avoid overload
    const BATCH = 25;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const slice = recipients.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map((r) =>
          sendIMailMessage({
            channel: "sms",
            recipient: r.phone,
            message: r.message,
            notification_type: "campaign",
            message_form: "plain",
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
        message: `Bulk SMS sent: ${successCount} ok, ${failedCount} failed`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-sms:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
