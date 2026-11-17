-- Create invoice reminder settings table
CREATE TABLE public.invoice_reminder_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  days_before_due INTEGER NOT NULL DEFAULT 3,
  days_after_due INTEGER[] NOT NULL DEFAULT ARRAY[1, 7, 14],
  send_email BOOLEAN NOT NULL DEFAULT true,
  send_sms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_reminder_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reminder settings"
  ON public.invoice_reminder_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminder settings"
  ON public.invoice_reminder_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder settings"
  ON public.invoice_reminder_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create invoice reminders log table
CREATE TABLE public.invoice_reminders_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.invoice_reminders_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view reminders for their invoices"
  ON public.invoice_reminders_log
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.invoices
    WHERE invoices.id = invoice_reminders_log.invoice_id
    AND invoices.user_id = auth.uid()
  ));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_invoice_reminder_settings_updated_at
  BEFORE UPDATE ON public.invoice_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;