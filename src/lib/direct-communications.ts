import { supabase } from "@/integrations/supabase/client";

export type CommunicationType = 
  | 'send_email'
  | 'send_sms'
  | 'send_invoice'
  | 'send_payment_receipt'
  | 'send_reservation_confirmation'
  | 'send_order_confirmation'
  | 'send_order_status_update';

interface CommunicationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
}

// Cache settings for 5 minutes
let settingsCache: { data: CommunicationSettings | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000;

async function getCommunicationSettings(): Promise<CommunicationSettings> {
  const now = Date.now();
  
  if (settingsCache.data && (now - settingsCache.timestamp) < CACHE_DURATION) {
    return settingsCache.data;
  }

  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['email_channel', 'sms_channel']);

    const settings: CommunicationSettings = {
      emailEnabled: true,
      smsEnabled: true,
    };

    data?.forEach((row) => {
      const value = row.setting_value as any;
      switch (row.setting_key) {
        case 'email_channel':
          settings.emailEnabled = value?.enabled !== false;
          break;
        case 'sms_channel':
          settings.smsEnabled = value?.enabled !== false;
          break;
      }
    });

    settingsCache = { data: settings, timestamp: now };
    return settings;
  } catch (error) {
    console.error('Error fetching communication settings:', error);
    return { emailEnabled: true, smsEnabled: true };
  }
}

// Direct email sending - stubbed out
export async function sendEmail(to: string, subject: string, html: string) {
  const settings = await getCommunicationSettings();
  
  if (!settings.emailEnabled) {
    console.log('Email channel is disabled, skipping');
    return null;
  }

  console.log('[STUB] Email service not configured. Would send to:', to);
  return { success: false, message: 'Email service not configured' };
}

// Direct SMS sending - stubbed out
export async function sendSMS(to: string, message: string) {
  const settings = await getCommunicationSettings();
  
  if (!settings.smsEnabled) {
    console.log('SMS channel is disabled, skipping');
    return null;
  }

  console.log('[STUB] SMS service not configured. Would send to:', to);
  return { success: false, message: 'SMS service not configured' };
}

// Send invoice - calls edge function
export async function sendInvoice(invoiceId: string, sendEmail = true, sendSMS = false) {
  const { data, error } = await supabase.functions.invoke('send-invoice', {
    body: { invoiceId, sendEmail, sendSMS },
  });

  if (error) {
    console.error('Error sending invoice:', error);
    throw error;
  }

  return data;
}

// Send payment receipt - calls edge function
export async function sendPaymentReceipt(customerEmail: string, html: string) {
  const { data, error } = await supabase.functions.invoke('send-payment-receipt', {
    body: { customerEmail, html },
  });

  if (error) {
    console.error('Error sending payment receipt:', error);
    throw error;
  }

  return data;
}

// Send reservation confirmation - calls edge function
export async function sendReservationConfirmation(
  reservationId: string,
  customerEmail?: string,
  customerPhone?: string
) {
  const { data, error } = await supabase.functions.invoke('send-reservation-confirmation', {
    body: { reservationId, customerEmail, customerPhone },
  });

  if (error) {
    console.error('Error sending reservation confirmation:', error);
    throw error;
  }

  return data;
}

// Send order confirmation - calls edge function
export async function sendOrderConfirmation(
  orderId: string,
  customerName?: string,
  customerEmail?: string,
  customerPhone?: string
) {
  const { data, error } = await supabase.functions.invoke('send-order-confirmation', {
    body: { orderId, customerName, customerEmail, customerPhone },
  });

  if (error) {
    console.error('Error sending order confirmation:', error);
    throw error;
  }

  return data;
}

// Send order status update - calls edge function
export async function sendOrderStatusUpdate(orderId: string, status: string, customerPhone?: string) {
  const { data, error } = await supabase.functions.invoke('send-order-status-update', {
    body: { orderId, status, customerPhone },
  });

  if (error) {
    console.error('Error sending order status update:', error);
    throw error;
  }

  return data;
}

// Clear settings cache
export function clearSettingsCache() {
  settingsCache = { data: null, timestamp: 0 };
}
