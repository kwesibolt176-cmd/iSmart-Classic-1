import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { sendIMailMessage } from "../_shared/imail-client.ts";
import { renderIsmartEmail } from "../_shared/ismart-email-template.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting invoice reminder check...');

    // Get all users with reminder settings enabled
    const { data: reminderSettings, error: settingsError } = await supabase
      .from('invoice_reminder_settings')
      .select('*')
      .eq('enabled', true);

    if (settingsError) {
      console.error('Error fetching reminder settings:', settingsError);
      throw settingsError;
    }

    console.log(`Found ${reminderSettings?.length || 0} users with reminders enabled`);

    let totalReminders = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each user - update overdue statuses
    for (const settings of reminderSettings || []) {
      try {
        // Get unpaid invoices for this user
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', settings.user_id)
          .in('status', ['sent', 'partially_paid', 'overdue']);

        if (invoicesError) {
          console.error(`Error fetching invoices for user ${settings.user_id}:`, invoicesError);
          continue;
        }

        // Check each invoice and update overdue status
        for (const invoice of invoices || []) {
          const dueDate = new Date(invoice.due_date);
          dueDate.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Check if invoice is overdue and should be updated
          if (daysDiff < 0 && invoice.status !== 'overdue') {
            await supabase
              .from('invoices')
              .update({ status: 'overdue' })
              .eq('id', invoice.id);
            console.log(`Updated invoice ${invoice.invoice_number} to overdue status`);
          }

          // Check if reminder should be sent (but we won't actually send)
          let shouldSendReminder = false;
          let reminderType = '';

          if (daysDiff === settings.days_before_due && invoice.status === 'sent') {
            shouldSendReminder = true;
            reminderType = 'before_due';
          } else if (daysDiff === 0 && (invoice.status === 'sent' || invoice.status === 'partially_paid')) {
            shouldSendReminder = true;
            reminderType = 'due_today';
          } else if (daysDiff < 0 && settings.days_after_due.includes(Math.abs(daysDiff))) {
            const { data: existingReminder } = await supabase
              .from('invoice_reminders_log')
              .select('id')
              .eq('invoice_id', invoice.id)
              .eq('reminder_type', `overdue_${Math.abs(daysDiff)}`)
              .single();

            if (!existingReminder) {
              shouldSendReminder = true;
              reminderType = `overdue_${Math.abs(daysDiff)}`;
            }
          }

          if (shouldSendReminder) {
            const subject = `Reminder: Invoice ${invoice.invoice_number}`;
            const dueDateLabel = new Date(invoice.due_date).toLocaleDateString();
            const html = renderIsmartEmail({
              title: "Invoice Reminder",
              documentTitle: subject,
              preheader: `Invoice ${invoice.invoice_number} due ${dueDateLabel}`,
              bodyHtml: `
                <h2>Hi ${invoice.customer_name || 'there'},</h2>
                <p>This is a friendly reminder for invoice <strong>${invoice.invoice_number}</strong> due on <strong>${dueDateLabel}</strong>.</p>
                ${invoice.total_amount ? `<p>Amount due: <strong>${invoice.currency || 'GHS'} ${invoice.total_amount}</strong></p>` : ''}
                <p>Please settle at your earliest convenience.</p>
                <p>Thank you,<br/><strong>The iSmartPay Team</strong></p>
              `,
            });
            const smsText = `Reminder: invoice ${invoice.invoice_number} due ${dueDateLabel}${invoice.total_amount ? ` for ${invoice.currency || ''} ${invoice.total_amount}` : ''}.`;

            let emailSent = false;
            let smsSent = false;
            let errMsg: string | null = null;

            try {
              if (invoice.customer_email) {
                const r = await sendIMailMessage({
                  channel: 'email',
                  recipient: invoice.customer_email,
                  message: html,
                  subject,
                  notification_type: 'notification',
                  message_form: 'html',
                });
                emailSent = r.ok;
                if (!r.ok) errMsg = `email status ${r.status}`;
              }
              if (invoice.customer_phone) {
                const r = await sendIMailMessage({
                  channel: 'sms',
                  recipient: invoice.customer_phone,
                  message: smsText,
                  notification_type: 'notification',
                  message_form: 'plain',
                });
                smsSent = r.ok;
                if (!r.ok) errMsg = (errMsg ? errMsg + '; ' : '') + `sms status ${r.status}`;
              }
            } catch (e: any) {
              errMsg = e?.message || 'send error';
            }

            await supabase
              .from('invoice_reminders_log')
              .insert({
                invoice_id: invoice.id,
                reminder_type: reminderType,
                email_sent: emailSent,
                sms_sent: smsSent,
                status: (emailSent || smsSent) ? 'sent' : 'failed',
                error_message: errMsg,
              });

            totalReminders++;
          }
        }

        // Process installments similarly - update overdue status
        const { data: installments } = await supabase
          .from('invoice_installments')
          .select('*')
          .eq('user_id', settings.user_id)
          .in('status', ['pending', 'partially_paid', 'overdue']);

        for (const installment of installments || []) {
          const dueDate = new Date(installment.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff < 0 && installment.status !== 'overdue') {
            await supabase
              .from('invoice_installments')
              .update({ status: 'overdue' })
              .eq('id', installment.id);
            console.log(`Updated installment #${installment.installment_number} to overdue status`);
          }
        }
      } catch (err) {
        console.error(`Error processing user ${settings.user_id}:`, err);
      }
    }

    console.log(`Invoice reminder check complete. ${totalReminders} reminders would have been sent.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalReminders,
        message: 'Email/SMS services not configured. Statuses updated but reminders not sent.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in check-invoice-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
