import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReservationConfirmationRequest {
  reservationId: string;
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

    const { reservationId }: ReservationConfirmationRequest = await req.json();

    const { data: reservation } = await supabaseClient
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (!reservation) throw new Error('Reservation not found');

    const name = reservation.customer_name || "Customer";
    const dateStr = reservation.reservation_date || reservation.date || '';
    const timeStr = reservation.reservation_time || reservation.time || '';
    const partySize = reservation.party_size || reservation.guests || '';

    const results: any = { email: null, sms: null };

    if (reservation.customer_email) {
      const html = renderIsmartEmail({
        title: "Reservation Confirmed",
        documentTitle: "Reservation Confirmed",
        preheader: `Reservation for ${dateStr} ${timeStr}`,
        bodyHtml: `
          <h2>Hi ${name},</h2>
          <p>Your reservation is confirmed for <strong>${dateStr} ${timeStr}</strong>${partySize ? ` for <strong>${partySize}</strong> guest(s)` : ''}.</p>
          <p>We look forward to seeing you.</p>
          <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
        `,
      });
      const r = await sendIMailMessage({
        channel: "email",
        recipient: reservation.customer_email,
        message: html,
        subject: `Reservation confirmed for ${dateStr} ${timeStr}`,
        notification_type: "notification",
        message_form: "html",
      });
      results.email = { ok: r.ok, status: r.status };
    }

    if (reservation.customer_phone) {
      const smsText = `Reservation confirmed for ${dateStr} ${timeStr}${partySize ? `, ${partySize} guest(s)` : ''}. See you soon.`;
      const r = await sendIMailMessage({
        channel: "sms",
        recipient: reservation.customer_phone,
        message: smsText,
        notification_type: "notification",
        message_form: "plain",
      });
      results.sms = { ok: r.ok, status: r.status };
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
