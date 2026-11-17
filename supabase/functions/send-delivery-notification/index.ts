import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeliveryNotificationRequest {
  deliveryOrderId: string;
  newStatus: string;
  previousStatus?: string;
  notes?: string;
  notifyBusiness?: boolean;
  notifyCustomer?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: DeliveryNotificationRequest = await req.json();
    const { deliveryOrderId, newStatus, previousStatus, notes, notifyBusiness = true, notifyCustomer = true } = body;

    if (!deliveryOrderId || !newStatus) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: delivery, error: deliveryError } = await adminClient
      .from("delivery_orders")
      .select("*, orders (order_number, customer_email, customer_phone, customer_name)")
      .eq("id", deliveryOrderId)
      .single();

    if (deliveryError || !delivery) {
      return new Response(
        JSON.stringify({ error: "Delivery order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const results: any = { business: null, customer: null, inApp: null, sms: null };
    const orderNumber = delivery.orders?.order_number || delivery.id.slice(0, 8).toUpperCase();

    if (notifyBusiness) {
      const { error: notifError } = await adminClient.from("notifications").insert({
        user_id: delivery.user_id,
        recipient_id: delivery.user_id,
        type: "delivery_update",
        title: `Delivery Update: ${newStatus}`,
        message: `Order ${orderNumber}: Status updated to ${newStatus}`,
        link: `/?section=deliveries`,
        metadata: { delivery_order_id: deliveryOrderId, status: newStatus, order_number: orderNumber },
      });
      if (!notifError) results.inApp = { success: true };
    }

    // Notify customer via email + SMS
    if (notifyCustomer) {
      const customerEmail = delivery.orders?.customer_email || delivery.customer_email;
      const customerPhone = delivery.orders?.customer_phone || delivery.customer_phone;
      const customerName = delivery.orders?.customer_name || delivery.customer_name || "Customer";

      if (customerEmail) {
        const html = renderIsmartEmail({
          title: "Delivery Update",
          documentTitle: `Order ${orderNumber} - Delivery Update`,
          preheader: `Order ${orderNumber}: ${newStatus}`,
          bodyHtml: `
            <h2>Hi ${customerName},</h2>
            <p>Your delivery for order <strong>${orderNumber}</strong> is now <strong>${newStatus}</strong>.</p>
            ${notes ? `<p>${notes}</p>` : ""}
            <p>Thank you for choosing us,<br/><strong>iSmartPay Delivery</strong></p>
          `,
        });
        const r = await sendIMailMessage({
          channel: "email",
          recipient: customerEmail,
          message: html,
          subject: `Delivery update for Order ${orderNumber}`,
          notification_type: "notification",
          message_form: "html",
        });
        results.customer = { ok: r.ok, status: r.status };
      }

      if (customerPhone) {
        const smsText = `Order ${orderNumber}: ${newStatus}.${notes ? ` ${notes}` : ""}`;
        const r = await sendIMailMessage({
          channel: "sms",
          recipient: customerPhone,
          message: smsText,
          notification_type: "notification",
          message_form: "plain",
        });
        results.sms = { ok: r.ok, status: r.status };
      }
    }

    await adminClient.from("delivery_activity_logs").insert({
      delivery_order_id: deliveryOrderId,
      delivery_partner_id: delivery.delivery_partner_id,
      action: `notification_sent_${newStatus}`,
      details: { previous_status: previousStatus, new_status: newStatus, notes, results },
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error sending delivery notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
