import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";
import { normalizeVerifiedMsisdn } from "../_shared/verification-proof.ts";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffInvitationRequest {
  staffName: string;
  staffEmail: string;
  staffPhone: string;
  businessName: string;
  sendEmail: boolean;
  sendSms: boolean;
  inviteUrl: string;
  roleName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      staffName,
      staffEmail,
      staffPhone,
      businessName,
      sendEmail,
      sendSms,
      inviteUrl,
      roleName,
    }: StaffInvitationRequest = await req.json();

    if (!inviteUrl || inviteUrl === "undefined" || !inviteUrl.includes("/staff-invite?token=")) {
      return new Response(JSON.stringify({ error: "Missing valid staff invite URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!sendEmail && !sendSms) {
      return new Response(JSON.stringify({ error: "Select email or SMS invite delivery" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const name = escapeHtml(staffName);
    const business = escapeHtml(businessName);
    const role = roleName ? escapeHtml(roleName) : "";
    const link = escapeHtml(inviteUrl);
    const subject = `You're invited to join ${businessName}`;
    const emailHtml = renderIsmartEmail({
      title: "You're Invited",
      documentTitle: subject,
      preheader: `${business} invited you to join their team`,
      bodyHtml: `
        <h2>Hi ${name},</h2>
        <p>You've been invited to join <strong>${business}</strong>${role ? ` as <strong>${role}</strong>` : ""}.</p>
        <p>Click the button below to accept the invite, set your password, and create your 4-digit staff PIN.</p>
        <p style="text-align:center;"><a class="btn" href="${link}">Accept Invitation</a></p>
        <p style="color:#666;font-size:13px;">Or open this link in your browser:<br/>
          <a href="${link}" style="word-break:break-all;">${link}</a>
        </p>
        <p style="color:#999;font-size:12px;">This invitation link will expire in 7 days.</p>
        <p>Welcome aboard,<br/><strong>${business} Team</strong></p>
      `,
    });

    type ChannelResult = { ok: boolean; status?: number };
    // Send each channel independently: a failed SMS must not report the whole
    // invite as failed after the email has already been delivered.
    const deliver = async (label: string, send: () => Promise<{ ok: boolean; status: number; body?: unknown }>): Promise<ChannelResult> => {
      try {
        const r = await send();
        if (!r.ok) console.error(`${label} invite failed`, r.status, r.body);
        return { ok: r.ok, status: r.status };
      } catch (error) {
        console.error(`${label} invite failed`, error instanceof Error ? error.message : error);
        return { ok: false };
      }
    };

    const emailResult: ChannelResult | null = sendEmail && staffEmail
      ? await deliver("Email", () => sendIMailMessage({
        channel: "email",
        recipient: staffEmail,
        message: emailHtml,
        subject,
        notification_type: "notification",
        message_form: "html",
      }))
      : null;

    const smsResult: ChannelResult | null = sendSms && staffPhone
      ? await deliver("SMS", () => sendIMailMessage({
        channel: "sms",
        recipient: normalizeVerifiedMsisdn(staffPhone).replace(/^\+/, ""),
        message: `Hi ${staffName}, you've been invited to join ${businessName}. Set up your account and PIN here: ${inviteUrl} (link expires in 7 days).`,
        notification_type: "notification",
        message_form: "plain",
      }))
      : null;

    const delivered = Boolean(emailResult?.ok || smsResult?.ok);
    return new Response(
      JSON.stringify({
        email: emailResult,
        sms: smsResult,
        delivered,
        message: delivered ? "Staff invitation sent" : "Staff invitation could not be delivered",
      }),
      { status: delivered ? 200 : 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error in send-staff-invitation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
