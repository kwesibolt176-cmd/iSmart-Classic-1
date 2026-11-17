-- Add Paystack-specific columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS paystack_plan_code TEXT;

-- Add Paystack-specific columns to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT,
ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
ADD COLUMN IF NOT EXISTS paystack_authorization_code TEXT,
ADD COLUMN IF NOT EXISTS paystack_email_token TEXT;

-- Create business_credits table for SMS/Email credit balances
CREATE TABLE IF NOT EXISTS public.business_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  sms_credits INTEGER NOT NULL DEFAULT 0,
  email_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Create credit_transactions table for tracking credit purchases and usage
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus')),
  credit_type TEXT NOT NULL CHECK (credit_type IN ('sms', 'email')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  paystack_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_transactions table for all Paystack payments
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'credit_topup', 'gift_card', 'one_time')),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_transaction_id TEXT,
  paystack_authorization_url TEXT,
  paystack_access_code TEXT,
  metadata JSONB,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_packages table for predefined credit top-up options
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('sms', 'email')),
  credits_amount INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.business_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- RLS for business_credits - only the business owner can view their credits
CREATE POLICY "Business owners can view their credits"
ON public.business_credits FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = business_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all credits"
ON public.business_credits FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage credits"
ON public.business_credits FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS for credit_transactions
CREATE POLICY "Business owners can view their credit transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = business_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all credit transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage credit transactions"
ON public.credit_transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS for payment_transactions
CREATE POLICY "Users can view their own payment transactions"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all payment transactions"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage payment transactions"
ON public.payment_transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS for credit_packages - all authenticated users can view active packages
CREATE POLICY "Anyone can view active credit packages"
ON public.credit_packages FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Super admins can manage credit packages"
ON public.credit_packages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at on business_credits
CREATE TRIGGER update_business_credits_updated_at
BEFORE UPDATE ON public.business_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on payment_transactions
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on credit_packages
CREATE TRIGGER update_credit_packages_updated_at
BEFORE UPDATE ON public.credit_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default credit packages
INSERT INTO public.credit_packages (name, credit_type, credits_amount, price, currency, display_order) VALUES
('SMS Starter', 'sms', 100, 15.00, 'GHS', 1),
('SMS Standard', 'sms', 500, 60.00, 'GHS', 2),
('SMS Premium', 'sms', 1000, 100.00, 'GHS', 3),
('SMS Enterprise', 'sms', 5000, 400.00, 'GHS', 4),
('Email Starter', 'email', 1000, 10.00, 'GHS', 5),
('Email Standard', 'email', 5000, 40.00, 'GHS', 6),
('Email Premium', 'email', 10000, 70.00, 'GHS', 7),
('Email Enterprise', 'email', 50000, 300.00, 'GHS', 8)
ON CONFLICT DO NOTHING;