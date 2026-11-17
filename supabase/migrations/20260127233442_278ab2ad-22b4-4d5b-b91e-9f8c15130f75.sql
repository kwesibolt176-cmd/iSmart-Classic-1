-- Utility/Bill payment types enum
CREATE TYPE public.utility_type AS ENUM ('airtime', 'data', 'electricity', 'water', 'tv', 'internet', 'insurance', 'other');

-- Utility service providers table
CREATE TABLE public.utility_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  utility_type utility_type NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  country TEXT DEFAULT 'GH',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bill/Utility payments table
CREATE TABLE public.utility_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.business_wallets(id),
  provider_id UUID REFERENCES public.utility_providers(id),
  utility_type utility_type NOT NULL,
  reference TEXT NOT NULL DEFAULT public.generate_transaction_reference('UTL'),
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'GHS',
  recipient_number TEXT NOT NULL,
  recipient_name TEXT,
  status transaction_status DEFAULT 'pending',
  provider_reference TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Settlements table
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.business_wallets(id),
  reference TEXT NOT NULL DEFAULT public.generate_transaction_reference('STL'),
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'GHS',
  status transaction_status DEFAULT 'pending',
  settlement_type TEXT DEFAULT 'automatic',
  destination_account TEXT,
  destination_bank TEXT,
  provider_reference TEXT,
  failure_reason TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  collections_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Business verification levels
CREATE TABLE public.business_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE UNIQUE,
  verification_level INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  business_registration_verified BOOLEAN DEFAULT false,
  identity_verified BOOLEAN DEFAULT false,
  address_verified BOOLEAN DEFAULT false,
  bank_verified BOOLEAN DEFAULT false,
  documents JSONB DEFAULT '[]',
  rejection_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.utility_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

-- Utility providers are public read
CREATE POLICY "Anyone can view active utility providers"
ON public.utility_providers FOR SELECT
USING (is_active = true);

-- Super admins can manage utility providers
CREATE POLICY "Super admins can manage utility providers"
ON public.utility_providers FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Utility payments policies
CREATE POLICY "Users can view their utility payments"
ON public.utility_payments FOR SELECT
USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create utility payments"
ON public.utility_payments FOR INSERT
WITH CHECK (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- Settlements policies
CREATE POLICY "Users can view their settlements"
ON public.settlements FOR SELECT
USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- Business verifications policies
CREATE POLICY "Users can view their verification status"
ON public.business_verifications FOR SELECT
USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can submit verification"
ON public.business_verifications FOR INSERT
WITH CHECK (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their verification"
ON public.business_verifications FOR UPDATE
USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- Super admin policies for all tables
CREATE POLICY "Super admins can view all utility payments"
ON public.utility_payments FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all settlements"
ON public.settlements FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all settlements"
ON public.settlements FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage verifications"
ON public.business_verifications FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Enable realtime for settlements
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.utility_payments;

-- Seed some utility providers
INSERT INTO public.utility_providers (name, slug, utility_type, is_active) VALUES
('MTN Ghana', 'mtn-gh', 'airtime', true),
('Vodafone Ghana', 'vodafone-gh', 'airtime', true),
('AirtelTigo', 'airteltigo', 'airtime', true),
('MTN Data', 'mtn-data', 'data', true),
('Vodafone Data', 'vodafone-data', 'data', true),
('ECG', 'ecg', 'electricity', true),
('Ghana Water', 'ghana-water', 'water', true),
('DStv', 'dstv', 'tv', true),
('GOtv', 'gotv', 'tv', true);

-- Add triggers for updated_at
CREATE TRIGGER update_utility_providers_updated_at
  BEFORE UPDATE ON public.utility_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_verifications_updated_at
  BEFORE UPDATE ON public.business_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();