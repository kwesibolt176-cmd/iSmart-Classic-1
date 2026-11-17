import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { sendIMailMessage } from "../_shared/imail-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteActionRequest {
  actionId: string;
}

interface ChannelSettings {
  enabled: boolean;
  from_name?: string;
  from_email?: string;
}

interface UsageLimitResult {
  withinLimit: boolean;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    const jwt = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : undefined;

    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (!user) {
      console.error('No user found for provided JWT');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { actionId }: ExecuteActionRequest = await req.json();
    if (!actionId || typeof actionId !== 'string') {
      return new Response(JSON.stringify({ error: 'A valid actionId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the pending action using service role to bypass RLS for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: action, error: fetchError } = await serviceClient
      .from('pending_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError) {
      console.error('Error fetching action:', fetchError);
      throw fetchError;
    }
    if (!action) throw new Error('Action not found');

    if (action.user_id !== user.id) {
      const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
        serviceClient.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        serviceClient.rpc('has_role', { _user_id: user.id, _role: 'super_admin' }),
      ]);
      if (!isAdmin && !isSuperAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch channel settings using service role for system_settings access
    const { data: settingsData } = await serviceClient
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['email_channel', 'sms_channel']);

    const emailSettings: ChannelSettings = settingsData?.find(s => s.setting_key === 'email_channel')?.setting_value || { enabled: true };
    const smsSettings: ChannelSettings = settingsData?.find(s => s.setting_key === 'sms_channel')?.setting_value || { enabled: true };

    // Check if channel is enabled for the action type
    const isEmailAction = ['send_email', 'send_invoice', 'send_payment_receipt'].includes(action.action_type);
    const isSmsAction = ['send_sms', 'send_order_confirmation', 'send_order_status_update'].includes(action.action_type);
    const isMultiChannelAction = action.action_type === 'send_reservation_confirmation';

    if (isEmailAction && !emailSettings.enabled) {
      // Mark as skipped due to channel being disabled
      await serviceClient
        .from('pending_actions')
        .update({
          status: 'rejected',
          notes: 'Email channel is disabled',
          executed_at: new Date().toISOString(),
        })
        .eq('id', actionId);

      return new Response(
        JSON.stringify({ success: false, message: 'Email channel is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isSmsAction && !smsSettings.enabled) {
      await serviceClient
        .from('pending_actions')
        .update({
          status: 'rejected',
          notes: 'SMS channel is disabled',
          executed_at: new Date().toISOString(),
        })
        .eq('id', actionId);

      return new Response(
        JSON.stringify({ success: false, message: 'SMS channel is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limits BEFORE executing actions
    if (isEmailAction) {
      const emailLimit = await checkUsageLimit(serviceClient, action.user_id, 'email');
      if (!emailLimit.withinLimit) {
        await serviceClient
          .from('pending_actions')
          .update({
            status: 'rejected',
            notes: `Email limit exceeded. Usage: ${emailLimit.currentUsage}/${emailLimit.limit}`,
            executed_at: new Date().toISOString(),
          })
          .eq('id', actionId);

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Email limit exceeded',
            usage: emailLimit.currentUsage,
            limit: emailLimit.limit 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (isSmsAction) {
      const smsLimit = await checkUsageLimit(serviceClient, action.user_id, 'sms');
      if (!smsLimit.withinLimit) {
        await serviceClient
          .from('pending_actions')
          .update({
            status: 'rejected',
            notes: `SMS limit exceeded. Usage: ${smsLimit.currentUsage}/${smsLimit.limit}`,
            executed_at: new Date().toISOString(),
          })
          .eq('id', actionId);

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'SMS limit exceeded',
            usage: smsLimit.currentUsage,
            limit: smsLimit.limit 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For multi-channel actions, check both limits
    if (isMultiChannelAction) {
      const requestData = action.request_data;
      
      if (requestData.customerEmail && emailSettings.enabled) {
        const emailLimit = await checkUsageLimit(serviceClient, action.user_id, 'email');
        if (!emailLimit.withinLimit) {
          await serviceClient
            .from('pending_actions')
            .update({
              status: 'rejected',
              notes: `Email limit exceeded. Usage: ${emailLimit.currentUsage}/${emailLimit.limit}`,
              executed_at: new Date().toISOString(),
            })
            .eq('id', actionId);

          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Email limit exceeded',
              usage: emailLimit.currentUsage,
              limit: emailLimit.limit 
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      if (requestData.customerPhone && smsSettings.enabled) {
        const smsLimit = await checkUsageLimit(serviceClient, action.user_id, 'sms');
        if (!smsLimit.withinLimit) {
          await serviceClient
            .from('pending_actions')
            .update({
              status: 'rejected',
              notes: `SMS limit exceeded. Usage: ${smsLimit.currentUsage}/${smsLimit.limit}`,
              executed_at: new Date().toISOString(),
            })
            .eq('id', actionId);

          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'SMS limit exceeded',
              usage: smsLimit.currentUsage,
              limit: smsLimit.limit 
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    let result;
    let errorMessage = null;

    try {
      // Execute the action based on type
      switch (action.action_type) {
        case 'send_email':
          result = await executeEmailAction(action.request_data, emailSettings);
          await logCommunication(serviceClient, action, 'email', action.request_data.to, action.request_data.subject, action.request_data.html, 'sent');
          await incrementEmailUsage(serviceClient, action.user_id);
          break;
        case 'send_sms':
          result = await executeSMSAction(action.request_data);
          await logCommunication(serviceClient, action, 'sms', action.request_data.to, null, action.request_data.message, 'sent');
          await incrementSMSUsage(serviceClient, action.user_id);
          break;
        case 'send_invoice':
          result = await executeInvoiceAction(action.request_data, emailSettings);
          await logCommunication(serviceClient, action, 'email', action.request_data.customerEmail, `Invoice ${action.request_data.invoiceNumber}`, action.request_data.html, 'sent');
          await incrementEmailUsage(serviceClient, action.user_id);
          break;
        case 'send_payment_receipt':
          result = await executePaymentReceiptAction(action.request_data, emailSettings);
          await logCommunication(serviceClient, action, 'email', action.request_data.customerEmail, 'Payment Receipt', action.request_data.html, 'sent');
          await incrementEmailUsage(serviceClient, action.user_id);
          break;
        case 'send_reservation_confirmation':
          result = await executeReservationConfirmationAction(action.request_data, emailSettings, smsSettings);
          if (action.request_data.customerEmail && emailSettings.enabled) {
            await logCommunication(serviceClient, action, 'email', action.request_data.customerEmail, 'Reservation Confirmation', action.request_data.emailHtml, 'sent');
            await incrementEmailUsage(serviceClient, action.user_id);
          }
          if (action.request_data.customerPhone && smsSettings.enabled) {
            await logCommunication(serviceClient, action, 'sms', action.request_data.customerPhone, null, action.request_data.smsMessage, 'sent');
            await incrementSMSUsage(serviceClient, action.user_id);
          }
          break;
        case 'send_order_confirmation':
          result = await executeOrderConfirmationAction(action.request_data);
          await logCommunication(serviceClient, action, 'sms', action.request_data.customerPhone, null, action.request_data.message, 'sent');
          await incrementSMSUsage(serviceClient, action.user_id);
          break;
        case 'send_order_status_update':
          result = await executeOrderStatusUpdateAction(action.request_data);
          await logCommunication(serviceClient, action, 'sms', action.request_data.customerPhone, null, action.request_data.message, 'sent');
          await incrementSMSUsage(serviceClient, action.user_id);
          break;
        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }

      // Update action as executed
      const { error: updateError } = await serviceClient
        .from('pending_actions')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          executed_by: user.id,
        })
        .eq('id', actionId);

      if (updateError) throw updateError;

      console.log('Action executed successfully:', result);
    } catch (error: any) {
      console.error('Error executing action:', error);
      errorMessage = error.message;

      // Log failed communication
      const channel = isEmailAction ? 'email' : 'sms';
      const recipient = action.request_data.to || action.request_data.customerEmail || action.request_data.customerPhone;
      await logCommunication(serviceClient, action, channel, recipient, null, null, 'failed', errorMessage);

      // Update action as failed
      await serviceClient
        .from('pending_actions')
        .update({
          status: 'failed',
          error_message: errorMessage,
          retry_count: action.retry_count + 1,
        })
        .eq('id', actionId);

      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in execute-pending-action function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function checkUsageLimit(
  supabaseClient: any, 
  userId: string, 
  type: 'sms' | 'email'
): Promise<UsageLimitResult> {
  try {
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select(`
        ${type}_usage,
        subscription_plans (
          ${type}_limit
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!subscription) {
      // No subscription means no limits (or use credits)
      // Check if they have credits instead
      const { data: credits } = await supabaseClient
        .from("business_credits")
        .select(`${type}_credits`)
        .eq("business_id", userId)
        .single();
      
      if (credits) {
        const creditBalance = credits[`${type}_credits`] || 0;
        return {
          withinLimit: creditBalance > 0,
          currentUsage: 0,
          limit: creditBalance,
          remaining: creditBalance
        };
      }
      
      return { withinLimit: true, currentUsage: 0, limit: null, remaining: null };
    }

    const plan = subscription.subscription_plans as any;
    const limit = plan?.[`${type}_limit`];
    const usage = subscription[`${type}_usage`] || 0;

    // null limit means unlimited
    if (!limit) {
      return { withinLimit: true, currentUsage: usage, limit: null, remaining: null };
    }

    return {
      withinLimit: usage < limit,
      currentUsage: usage,
      limit,
      remaining: Math.max(0, limit - usage)
    };
  } catch (error) {
    console.error(`Error checking ${type} usage limit:`, error);
    // On error, allow the action (fail open for user experience)
    return { withinLimit: true, currentUsage: 0, limit: null, remaining: null };
  }
}

async function logCommunication(
  client: any,
  action: any,
  channel: string,
  recipient: string,
  subject: string | null,
  content: string | null,
  status: string,
  errorMessage?: string
) {
  try {
    await client.from('communication_logs').insert({
      user_id: action.user_id,
      action_id: action.id,
      channel,
      recipient: recipient || 'unknown',
      subject,
      content: content || '',
      status,
      error_message: errorMessage,
      metadata: { action_type: action.action_type, priority: action.priority },
    });
  } catch (error) {
    console.error('Error logging communication:', error);
  }
}

async function executeEmailAction(data: any, _settings: ChannelSettings) {
  const { to, subject, html } = data;

  const result = await sendIMailMessage({
    channel: "email",
    recipient: to,
    message: html,
    subject,
    notification_type: "notification",
    message_form: "html",
  });

  if (!result.ok) {
    const errMsg = (result.body && (result.body.error || result.body.message)) || `iMail email error (status ${result.status})`;
    throw new Error(errMsg);
  }

  return result.body;
}

async function executeSMSAction(data: any) {
  const { to, message } = data;

  const result = await sendIMailMessage({
    channel: "sms",
    recipient: to,
    message,
    notification_type: "notification",
    message_form: "plain",
  });

  if (!result.ok) {
    const errMsg = (result.body && (result.body.error || result.body.message)) || `iMail SMS error (status ${result.status})`;
    throw new Error(errMsg);
  }

  console.log('SMS sent successfully via iMail:', result.body?.message_id || result.body?.id);
  return result.body;
}

async function executeInvoiceAction(data: any, settings: ChannelSettings) {
  return await executeEmailAction({
    to: data.customerEmail,
    subject: `Invoice ${data.invoiceNumber}`,
    html: data.html,
  }, settings);
}

async function executePaymentReceiptAction(data: any, settings: ChannelSettings) {
  return await executeEmailAction({
    to: data.customerEmail,
    subject: 'Payment Receipt',
    html: data.html,
  }, settings);
}

async function executeReservationConfirmationAction(data: any, emailSettings: ChannelSettings, smsSettings: ChannelSettings) {
  const results: any = { email: null, sms: null };

  if (data.customerEmail && emailSettings.enabled) {
    results.email = await executeEmailAction({
      to: data.customerEmail,
      subject: 'Reservation Confirmation',
      html: data.emailHtml,
    }, emailSettings);
  }

  if (data.customerPhone && smsSettings.enabled) {
    results.sms = await executeSMSAction({
      to: data.customerPhone,
      message: data.smsMessage,
    });
  }

  return results;
}

async function executeOrderConfirmationAction(data: any) {
  if (data.customerPhone) {
    return await executeSMSAction({
      to: data.customerPhone,
      message: data.message,
    });
  }
  throw new Error('No customer phone number provided');
}

async function executeOrderStatusUpdateAction(data: any) {
  if (data.customerPhone) {
    return await executeSMSAction({
      to: data.customerPhone,
      message: data.message,
    });
  }
  throw new Error('No customer phone number provided');
}

async function incrementSMSUsage(supabaseClient: any, userId: string) {
  try {
    // First try to increment subscription usage
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("id, sms_usage")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (subscription) {
      await supabaseClient
        .from("user_subscriptions")
        .update({ sms_usage: (subscription.sms_usage || 0) + 1 })
        .eq("id", subscription.id);
      return;
    }

    // If no subscription, deduct from credits
    const { data: credits } = await supabaseClient
      .from("business_credits")
      .select("id, sms_credits")
      .eq("business_id", userId)
      .single();

    if (credits && credits.sms_credits > 0) {
      const newBalance = credits.sms_credits - 1;
      await supabaseClient
        .from("business_credits")
        .update({ sms_credits: newBalance })
        .eq("id", credits.id);
      
      // Log the credit transaction
      await supabaseClient
        .from("credit_transactions")
        .insert({
          business_id: userId,
          credit_type: 'sms',
          transaction_type: 'debit',
          amount: 1,
          balance_after: newBalance,
          description: 'SMS sent'
        });
    }
  } catch (error) {
    console.error("Error incrementing SMS usage:", error);
  }
}

async function incrementEmailUsage(supabaseClient: any, userId: string) {
  try {
    // First try to increment subscription usage
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("id, email_usage")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (subscription) {
      await supabaseClient
        .from("user_subscriptions")
        .update({ email_usage: (subscription.email_usage || 0) + 1 })
        .eq("id", subscription.id);
      return;
    }

    // If no subscription, deduct from credits
    const { data: credits } = await supabaseClient
      .from("business_credits")
      .select("id, email_credits")
      .eq("business_id", userId)
      .single();

    if (credits && credits.email_credits > 0) {
      const newBalance = credits.email_credits - 1;
      await supabaseClient
        .from("business_credits")
        .update({ email_credits: newBalance })
        .eq("id", credits.id);
      
      // Log the credit transaction
      await supabaseClient
        .from("credit_transactions")
        .insert({
          business_id: userId,
          credit_type: 'email',
          transaction_type: 'debit',
          amount: 1,
          balance_after: newBalance,
          description: 'Email sent'
        });
    }
  } catch (error) {
    console.error("Error incrementing email usage:", error);
  }
}

serve(handler);
