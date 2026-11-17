import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  ticket_id: string;
  notification_type: "new_reply" | "status_change";
  message?: string;
  new_status?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { ticket_id, notification_type, message, new_status }: NotificationRequest = await req.json();

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("user_id, subject, email")
      .eq("id", ticket_id)
      .single();

    if (!ticket) throw new Error("Ticket not found");

    // In-app notification
    await supabase.from("notifications").insert({
      user_id: ticket.user_id,
      recipient_id: ticket.user_id,
      type: "support_update",
      title: notification_type === "new_reply" ? "New Reply on Support Ticket" : "Ticket Status Updated",
      message: `Your support ticket "${ticket.subject}" has been updated.`,
      link: "/support",
    });

    let emailResult: any = null;
    let recipientEmail = ticket.email as string | null;
    if (!recipientEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", ticket.user_id)
        .single();
      recipientEmail = profile?.email ?? null;
    }

    if (recipientEmail) {
      const subject = notification_type === "new_reply"
        ? `New reply on your ticket: ${ticket.subject}`
        : `Ticket status updated: ${ticket.subject}`;

      const html = renderIsmartEmail({
        title: "Support Ticket Update",
        documentTitle: subject,
        preheader: `Update on "${ticket.subject}"`,
        bodyHtml: `
          <h2>Hello,</h2>
          <p>Your support ticket <strong>"${ticket.subject}"</strong> has been updated.</p>
          ${new_status ? `<p>New status: <strong>${new_status}</strong></p>` : ""}
          ${message ? `<blockquote style="border-left:4px solid #7cb342;padding-left:12px;color:#555;margin:12px 0;">${message}</blockquote>` : ""}
          <p>You can view and reply in your dashboard.</p>
          <p>Thank you,<br/><strong>iSmartPay Support</strong></p>
        `,
      });

      const r = await sendIMailMessage({
        channel: "email",
        recipient: recipientEmail,
        message: html,
        subject,
        notification_type: "notification",
        message_form: "html",
      });
      emailResult = { ok: r.ok, status: r.status };
    }

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error in send-support-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
