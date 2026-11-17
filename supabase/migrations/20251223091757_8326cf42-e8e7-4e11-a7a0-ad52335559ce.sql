-- Recurring invoices table
CREATE TABLE public.recurring_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- weekly, biweekly, monthly, quarterly, yearly
  next_invoice_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invoices_generated INTEGER NOT NULL DEFAULT 0,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Late fee settings table
CREATE TABLE public.invoice_late_fee_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  fee_type TEXT NOT NULL DEFAULT 'percentage', -- percentage or fixed
  fee_amount NUMERIC NOT NULL DEFAULT 5,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  max_fee_amount NUMERIC,
  apply_automatically BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Late fees applied to invoices
CREATE TABLE public.invoice_late_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  fee_amount NUMERIC NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  days_overdue INTEGER NOT NULL,
  notes TEXT
);

-- Invoice templates table
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  header_color TEXT DEFAULT '#1a1a1a',
  accent_color TEXT DEFAULT '#3b82f6',
  footer_text TEXT,
  terms_and_conditions TEXT,
  bank_details TEXT,
  show_payment_instructions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deposit settings for invoices
CREATE TABLE public.invoice_deposit_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  require_deposit BOOLEAN NOT NULL DEFAULT false,
  deposit_type TEXT NOT NULL DEFAULT 'percentage', -- percentage or fixed
  deposit_amount NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add deposit fields to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS deposit_required NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS late_fees_applied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.invoice_templates(id),
ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID;

-- Customer payment history view columns - add payment tracking fields
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS original_due_date DATE,
ADD COLUMN IF NOT EXISTS days_to_payment INTEGER;

-- Enable RLS on new tables
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_late_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_late_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_deposit_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_invoices
CREATE POLICY "Users can view their recurring invoices" ON public.recurring_invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create recurring invoices" ON public.recurring_invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their recurring invoices" ON public.recurring_invoices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their recurring invoices" ON public.recurring_invoices
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for invoice_late_fee_settings
CREATE POLICY "Users can view their late fee settings" ON public.invoice_late_fee_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create late fee settings" ON public.invoice_late_fee_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their late fee settings" ON public.invoice_late_fee_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for invoice_late_fees
CREATE POLICY "Users can view their invoice late fees" ON public.invoice_late_fees
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create invoice late fees" ON public.invoice_late_fees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for invoice_templates
CREATE POLICY "Users can view their templates" ON public.invoice_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create templates" ON public.invoice_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their templates" ON public.invoice_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their templates" ON public.invoice_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for invoice_deposit_settings
CREATE POLICY "Users can view their deposit settings" ON public.invoice_deposit_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create deposit settings" ON public.invoice_deposit_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their deposit settings" ON public.invoice_deposit_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_recurring_invoices_updated_at
  BEFORE UPDATE ON public.recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_templates_updated_at
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_late_fee_settings_updated_at
  BEFORE UPDATE ON public.invoice_late_fee_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_deposit_settings_updated_at
  BEFORE UPDATE ON public.invoice_deposit_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate days to payment when invoice is paid
CREATE OR REPLACE FUNCTION public.calculate_days_to_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.payment_date IS NOT NULL THEN
    NEW.days_to_payment := DATE_PART('day', NEW.payment_date - NEW.issue_date::timestamp);
    IF NEW.original_due_date IS NULL THEN
      NEW.original_due_date := OLD.due_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_invoice_days_to_payment
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.calculate_days_to_payment();