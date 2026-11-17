import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";
import { publicAppUrl } from "../_shared/public-app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptRequest {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount?: number;
  total?: number;
  businessName?: string;
  businessId: string;
  sendEmail: boolean;
  sendSMS: boolean;
  currency?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestBody: ReceiptRequest = await req.json();
    const {
      orderId,
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      businessName = "iSmartPay",
      sendEmail,
      sendSMS,
      currency = "GHS",
    } = requestBody;
    const totalAmount = requestBody.totalAmount ?? requestBody.total ?? 0;

    const cleanOrderNumber = (orderNumber || orderId.slice(0, 8)).replace(/^#/, "");
    const baseUrl = publicAppUrl();
    const receiptUrl = `${baseUrl}/receipt?order=${encodeURIComponent(cleanOrderNumber)}`;
    const amountLabel = `${currency} ${Number(totalAmount).toFixed(2)}`;

    const html = renderIsmartEmail({
      title: "Transaction Successful",
      documentTitle: `Receipt for Order ${cleanOrderNumber}`,
      preheader: `Thank you for shopping with ${businessName}`,
      bodyHtml: `
        <h2>Hi ${customerName || "Customer"},</h2>
        <p>Thank you for your purchase from <strong>${businessName}</strong>.</p>
        <p>Order: <strong>#${cleanOrderNumber}</strong><br/>
           Total: <strong>${amountLabel}</strong></p>
        <p style="text-align:center;"><a class="btn" href="${receiptUrl}">View Receipt</a></p>
        <p>Thank you,<br/><strong>${businessName}</strong></p>
      `,
    });

    let emailResult: any = null;
    let smsResult: any = null;

    if (sendEmail && customerEmail) {
      const r = await sendIMailMessage({
        channel: "email",
        recipient: customerEmail,
        message: html,
        subject: `Receipt for Order #${cleanOrderNumber}`,
        notification_type: "notification",
        message_form: "html",
      });
      emailResult = { ok: r.ok, status: r.status };
    }

    if (sendSMS && customerPhone) {
      const r = await sendIMailMessage({
        channel: "sms",
        recipient: customerPhone,
        message: `Thanks for shopping with ${businessName}! Order #${cleanOrderNumber} (${amountLabel}). Receipt: ${receiptUrl}`,
        notification_type: "notification",
        message_form: "plain",
      });
      smsResult = { ok: r.ok, status: r.status };
    }

    return new Response(
      JSON.stringify({ email: emailResult, sms: smsResult, receiptUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
