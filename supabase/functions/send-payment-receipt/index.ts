import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";
import { publicAppUrl } from "../_shared/public-app-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReceiptRequest {
  transactionId: string;
  customerEmail?: string;
  customerPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing authorization header");
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );

    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { transactionId, customerEmail, customerPhone }: PaymentReceiptRequest = await req.json();

    const { data: transaction } = await supabaseClient
      .from("transactions")
      .select("transaction_number, amount, currency, orders(order_number, customer_email, customer_phone, customer_name)")
      .eq("id", transactionId)
      .single();

    const order: any = transaction?.orders || {};
    const orderNumber = order?.order_number || "N/A";
    const cleanOrder = String(orderNumber).replace(/^#/, "");
    const receiptUrl = `${publicAppUrl()}/receipt?order=${encodeURIComponent(cleanOrder)}`;
    const email = customerEmail || order.customer_email;
    const phone = customerPhone || order.customer_phone;
    const name = order.customer_name || "Customer";
    const amount = transaction?.amount ? `${transaction?.currency || "GHS"} ${transaction.amount}` : "";

    const html = renderIsmartEmail({
      title: "Transaction Successful",
      documentTitle: `Receipt for Order ${orderNumber}`,
      preheader: `Receipt for order ${orderNumber}${amount ? ` - ${amount}` : ""}`,
      bodyHtml: `
        <h2>Hi ${name},</h2>
        <p>Thank you for your payment${amount ? ` of <strong>${amount}</strong>` : ""}.</p>
        <p>Order: <strong>${orderNumber}</strong><br/>
           Transaction: <strong>${transaction?.transaction_number || transactionId}</strong></p>
        <p style="text-align:center;"><a class="btn" href="${receiptUrl}">View Receipt</a></p>
        <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
      `,
    });

    let emailResult: any = null;
    let smsResult: any = null;
    if (email) {
      const r = await sendIMailMessage({
        channel: "email",
        recipient: email,
        message: html,
        subject: `Receipt for Order ${orderNumber}`,
        notification_type: "notification",
        message_form: "html",
      });
      emailResult = { ok: r.ok, status: r.status };
    }
    if (phone) {
      const r = await sendIMailMessage({
        channel: "sms",
        recipient: phone,
        message: `Payment received for order ${orderNumber}${amount ? ` (${amount})` : ""}. Receipt: ${receiptUrl}`,
        notification_type: "notification",
        message_form: "plain",
      });
      smsResult = { ok: r.ok, status: r.status };
    }

    return new Response(
      JSON.stringify({ success: true, results: { email: emailResult, sms: smsResult }, receiptUrl }),
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
