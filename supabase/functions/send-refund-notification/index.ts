import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundNotificationRequest {
  refundId: string;
  status: "approved" | "rejected";
  adminNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { refundId, status, adminNotes }: RefundNotificationRequest = await req.json();

    if (!refundId || !status) {
      throw new Error("Missing required fields: refundId and status");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: refund } = await supabase
      .from("refund_requests")
      .select("*, orders(order_number, customer_email, customer_name)")
      .eq("id", refundId)
      .single();

    const email = refund?.customer_email || refund?.orders?.customer_email;
    const name = refund?.customer_name || refund?.orders?.customer_name || "Customer";
    const orderNo = refund?.orders?.order_number || refundId.slice(0, 8);

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: "No customer email on refund record" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const subject = status === "approved"
      ? `Refund Approved for Order ${orderNo}`
      : `Refund Update for Order ${orderNo}`;

    const isApproved = status === "approved";
    const html = renderIsmartEmail({
      title: isApproved ? "Refund Approved" : "Refund Update",
      titleColor: isApproved ? "#000000" : "#c0392b",
      documentTitle: subject,
      preheader: `Refund ${status} for order ${orderNo}`,
      bodyHtml: `
        <h2>Hi ${name},</h2>
        <p>Your refund request for order <strong>${orderNo}</strong> has been <strong>${status}</strong>.</p>
        ${adminNotes ? `<p><strong>Note from our team:</strong> ${adminNotes}</p>` : ""}
        <p>If you have any questions, simply reply to this email and our team will be happy to help.</p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    });

    const result = await sendIMailMessage({
      channel: "email",
      recipient: email,
      message: html,
      subject,
      notification_type: "notification",
      message_form: "html",
    });

    return new Response(
      JSON.stringify({ success: result.ok, status: result.status, body: result.body }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending refund notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
