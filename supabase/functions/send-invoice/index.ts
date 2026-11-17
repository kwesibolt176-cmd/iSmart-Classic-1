import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";
import { publicAppUrl } from "../_shared/public-app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  invoiceId: string;
  sendEmail?: boolean;
  sendSMS?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing authorization header");
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { invoiceId, sendEmail = true, sendSMS = false }: InvoiceRequest = await req.json();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, customers(*)")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) throw new Error("Invoice not found");

    let paymentToken = invoice.payment_link_token;
    if (!paymentToken) {
      paymentToken = crypto.randomUUID();
      await supabase
        .from("invoices")
        .update({ payment_link_token: paymentToken })
        .eq("id", invoiceId);
    }

    const baseUrl = publicAppUrl();
    const invoiceViewUrl = `${baseUrl}/invoice?token=${paymentToken}`;

    await supabase
      .from("invoices")
      .update({
        status: invoice.status === "draft" ? "sent" : invoice.status,
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    const dueDateLabel = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString()
      : "N/A";
    const amountLabel = `GHS ${invoice.total?.toFixed(2) || "0.00"}`;
    const subject = `Invoice ${invoice.invoice_number} - Payment Required`;

    const emailHtml = renderIsmartEmail({
      title: "New Invoice",
      documentTitle: subject,
      preheader: `Invoice ${invoice.invoice_number} - ${amountLabel}`,
      bodyHtml: `
        <h2>Dear ${invoice.customers?.name || "Customer"},</h2>
        <p>Please find your invoice details below:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr>
            <td style="padding:10px;border:1px solid #eee;"><strong>Invoice Number</strong></td>
            <td style="padding:10px;border:1px solid #eee;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee;"><strong>Amount Due</strong></td>
            <td style="padding:10px;border:1px solid #eee;">${amountLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee;"><strong>Due Date</strong></td>
            <td style="padding:10px;border:1px solid #eee;">${dueDateLabel}</td>
          </tr>
        </table>
        <p style="text-align:center;"><a class="btn" href="${invoiceViewUrl}">View & Pay Invoice</a></p>
        <p style="color:#666;font-size:13px;">Or copy this link: <a href="${invoiceViewUrl}">${invoiceViewUrl}</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    });

    let emailResult: any = null;
    let smsResult: any = null;

    if (sendEmail && invoice.customers?.email) {
      const r = await sendIMailMessage({
        channel: "email",
        recipient: invoice.customers.email,
        message: emailHtml,
        subject,
        notification_type: "notification",
        message_form: "html",
      });
      emailResult = { ok: r.ok, status: r.status };
    }

    if (sendSMS && invoice.customers?.phone) {
      const smsMessage = `Invoice ${invoice.invoice_number}: amount due ${amountLabel}. Pay now: ${invoiceViewUrl}`;
      const r = await sendIMailMessage({
        channel: "sms",
        recipient: invoice.customers.phone,
        message: smsMessage,
        notification_type: "notification",
        message_form: "plain",
      });
      smsResult = { ok: r.ok, status: r.status };
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailResult,
        smsResult,
        invoiceUrl: invoiceViewUrl,
        message: "Invoice delivered via iSmart",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in send-invoice:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
