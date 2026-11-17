import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderConfirmationRequest {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  channel?: 'sms' | 'whatsapp';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing authorization header');
    }
    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
    );

    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error('Not authenticated');

    const { orderId, customerName, customerEmail, customerPhone }: OrderConfirmationRequest = await req.json();

    const { data: order } = await supabaseClient
      .from('orders')
      .select('order_number, customer_phone, customer_email, customer_name, total_amount, currency')
      .eq('id', orderId)
      .single();

    const phone = customerPhone || order?.customer_phone;
    const email = customerEmail || order?.customer_email;
    const name = customerName || order?.customer_name || "Customer";
    const orderNo = order?.order_number || orderId.slice(0, 8);
    const trackingUrl = `https://app.getdowo.com/order-tracking?phone=${encodeURIComponent(phone || '')}`;

    const results: any = { email: null, sms: null };

    if (email) {
      const html = renderIsmartEmail({
        title: "Transaction Successful",
        documentTitle: `Order ${orderNo} Confirmed`,
        preheader: `Order ${orderNo} confirmed`,
        bodyHtml: `
          <h2>Hi ${name},</h2>
          <p>Thanks for your order <strong>${orderNo}</strong>${order?.total_amount ? ` for <strong>${order.currency || 'GHS'} ${order.total_amount}</strong>` : ''}.</p>
          <p>You can track your order status anytime:</p>
          <p style="text-align:center;"><a class="btn" href="${trackingUrl}">Track Order</a></p>
          <p style="font-size:13px;color:#666;">Or copy this link: <a href="${trackingUrl}">${trackingUrl}</a></p>
          <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
        `,
      });
      const r = await sendIMailMessage({
        channel: "email",
        recipient: email,
        message: html,
        subject: `Order ${orderNo} confirmed`,
        notification_type: "notification",
        message_form: "html",
      });
      results.email = { ok: r.ok, status: r.status };
    }

    if (phone) {
      const smsText = `Order ${orderNo} confirmed. Track: ${trackingUrl}`;
      const r = await sendIMailMessage({
        channel: "sms",
        recipient: phone,
        message: smsText,
        notification_type: "notification",
        message_form: "plain",
      });
      results.sms = { ok: r.ok, status: r.status };
    }

    return new Response(
      JSON.stringify({ success: true, results, trackingUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }
};

serve(handler);
