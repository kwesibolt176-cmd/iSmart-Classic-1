import { supabase } from "@/integrations/supabase/client";

export type ActionType = 
  | 'send_email'
  | 'send_sms'
  | 'send_invoice'
  | 'send_payment_receipt'
  | 'process_payment'
  | 'send_reservation_confirmation'
  | 'send_order_confirmation'
  | 'send_order_status_update';

export type ActionPriority = 'low' | 'normal' | 'high' | 'urgent';

interface CreatePendingActionParams {
  actionType: ActionType;
  requestData: any;
  priority?: ActionPriority;
  notes?: string;
}

interface CommunicationSettings {
  autoExecute: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

// Cache settings for 5 minutes
let settingsCache: { data: CommunicationSettings | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCommunicationSettings(): Promise<CommunicationSettings> {
  const now = Date.now();
  
  // Return cached if still valid
  if (settingsCache.data && (now - settingsCache.timestamp) < CACHE_DURATION) {
    return settingsCache.data;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['communication_auto_execute', 'email_channel', 'sms_channel']);

    if (error) {
      console.error('Error fetching communication settings:', error);
      // Return defaults on error - default to enabled
      return { autoExecute: false, emailEnabled: true, smsEnabled: true };
    }

    const settings: CommunicationSettings = {
      autoExecute: false,
      emailEnabled: true,
      smsEnabled: true,
    };

    console.log('Fetched communication settings from DB:', data);

    data?.forEach((row) => {
      const value = row.setting_value as any;
      switch (row.setting_key) {
        case 'communication_auto_execute':
          settings.autoExecute = value?.enabled === true;
          break;
        case 'email_channel':
          // Default to true if not explicitly disabled
          settings.emailEnabled = value?.enabled !== false;
          break;
        case 'sms_channel':
          // Default to true if not explicitly disabled
          settings.smsEnabled = value?.enabled !== false;
          break;
      }
    });

    console.log('Parsed communication settings:', settings);
    settingsCache = { data: settings, timestamp: now };
    return settings;
  } catch (error) {
    console.error('Error fetching communication settings:', error);
    // Return defaults on error - default to enabled
    return { autoExecute: false, emailEnabled: true, smsEnabled: true };
  }
}

async function executeActionImmediately(actionId: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke("execute-pending-action", {
      body: { actionId },
    });

    if (error) {
      console.error('Error auto-executing action:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error auto-executing action:', error);
    return false;
  }
}

export async function createPendingAction({
  actionType,
  requestData,
  priority = 'normal',
  notes,
}: CreatePendingActionParams) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get communication settings
  const settings = await getCommunicationSettings();

  // Check if the channel is enabled
  const isEmailAction = ['send_email', 'send_invoice', 'send_payment_receipt'].includes(actionType);
  const isSmsAction = ['send_sms', 'send_order_confirmation', 'send_order_status_update'].includes(actionType);
  const isMultiChannelAction = actionType === 'send_reservation_confirmation';

  if (isEmailAction && !settings.emailEnabled) {
    console.log('Email channel is disabled, skipping action');
    return null;
  }

  if (isSmsAction && !settings.smsEnabled) {
    console.log('SMS channel is disabled, skipping action');
    return null;
  }

  // Create the pending action
  const { data, error } = await supabase
    .from('pending_actions')
    .insert({
      user_id: user.id,
      action_type: actionType,
      request_data: requestData,
      priority,
      notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  // If auto-execute is enabled, execute immediately
  if (settings.autoExecute && data) {
    console.log('Auto-executing action:', actionType);
    // Execute in background, don't wait for it
    executeActionImmediately(data.id).then((success) => {
      if (!success) {
        console.error('Failed to auto-execute action:', data.id);
      }
    });
  }
  
  return data;
}

// Helper functions for specific action types
export async function createEmailAction(to: string, subject: string, html: string, priority?: ActionPriority) {
  return createPendingAction({
    actionType: 'send_email',
    requestData: { to, subject, html },
    priority,
  });
}

export async function createSMSAction(to: string, message: string, priority?: ActionPriority) {
  return createPendingAction({
    actionType: 'send_sms',
    requestData: { to, message },
    priority,
  });
}

export async function createInvoiceAction(invoiceNumber: string, customerEmail: string, html: string, priority?: ActionPriority) {
  return createPendingAction({
    actionType: 'send_invoice',
    requestData: { invoiceNumber, customerEmail, html },
    priority,
  });
}

export async function createPaymentReceiptAction(customerEmail: string, html: string, priority?: ActionPriority) {
  return createPendingAction({
    actionType: 'send_payment_receipt',
    requestData: { customerEmail, html },
    priority,
  });
}

export async function createReservationConfirmationAction(
  customerEmail: string | null,
  customerPhone: string | null,
  emailHtml: string,
  smsMessage: string,
  priority?: ActionPriority
) {
  return createPendingAction({
    actionType: 'send_reservation_confirmation',
    requestData: { customerEmail, customerPhone, emailHtml, smsMessage },
    priority,
  });
}

export async function createOrderConfirmationAction(customerPhone: string, message: string, priority?: ActionPriority) {
  return createPendingAction({
    actionType: 'send_order_confirmation',
    requestData: { customerPhone, message },
    priority,
  });
}

export async function createOrderStatusUpdateAction(customerPhone: string, message: string, priority?: ActionPriority) {
  return createPendingAction({
    actionType: 'send_order_status_update',
    requestData: { customerPhone, message },
    priority,
  });
}

// Utility to clear settings cache (useful after settings update)
export function clearSettingsCache() {
  settingsCache = { data: null, timestamp: 0 };
}