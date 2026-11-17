-- =============================================
-- FINTECH PLATFORM CORE SCHEMA
-- =============================================

-- Enum types for fintech operations
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed');
CREATE TYPE transaction_type AS ENUM ('collection', 'disbursement', 'wallet_credit', 'wallet_debit', 'transfer', 'fee');
CREATE TYPE payout_channel AS ENUM ('bank_transfer', 'mobile_money');
CREATE TYPE collection_type AS ENUM ('payment_link', 'invoice', 'bulk');

-- =============================================
-- BUSINESS WALLETS
-- =============================================
CREATE TABLE public.business_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_collected DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_disbursed DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, currency)
);

-- Enable RLS
ALTER TABLE public.business_wallets ENABLE ROW LEVEL SECURITY;

-- Policies for business_wallets
CREATE POLICY "Business owners can view their wallets"
  ON public.business_wallets FOR SELECT
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Business owners can update their wallets"
  ON public.business_wallets FOR UPDATE
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- =============================================
-- WALLET TRANSACTIONS (ledger)
-- =============================================
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.business_wallets(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) DEFAULT 0,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  reference VARCHAR(100) UNIQUE NOT NULL,
  external_reference VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for wallet_transactions
CREATE POLICY "Business owners can view their wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (wallet_id IN (
    SELECT w.id FROM public.business_wallets w
    JOIN public.business_profiles bp ON w.business_id = bp.id
    WHERE bp.user_id = auth.uid()
  ));

-- =============================================
-- PAYMENT PROVIDERS (Mobile Money, Banks)
-- =============================================
CREATE TABLE public.payment_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  provider_type payout_channel NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  supports_collection BOOLEAN NOT NULL DEFAULT true,
  supports_disbursement BOOLEAN NOT NULL DEFAULT true,
  min_amount DECIMAL(15, 2) DEFAULT 1,
  max_amount DECIMAL(15, 2),
  fee_type VARCHAR(20) DEFAULT 'percentage', -- 'fixed' or 'percentage' or 'tiered'
  fee_value DECIMAL(10, 4) DEFAULT 0,
  fee_cap DECIMAL(15, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

-- Public read access for providers
CREATE POLICY "Anyone can view active payment providers"
  ON public.payment_providers FOR SELECT
  USING (is_active = true);

-- Insert default Ghana providers
INSERT INTO public.payment_providers (name, slug, provider_type, supports_collection, supports_disbursement, fee_type, fee_value) VALUES
  ('MTN Mobile Money', 'mtn-momo', 'mobile_money', true, true, 'percentage', 1.5),
  ('Vodafone Cash', 'vodafone-cash', 'mobile_money', true, true, 'percentage', 1.5),
  ('AirtelTigo Money', 'airteltigo-money', 'mobile_money', true, true, 'percentage', 1.5),
  ('Bank Transfer', 'bank-transfer', 'bank_transfer', true, true, 'fixed', 5.00);

-- =============================================
-- PAYMENT LINKS (Collections)
-- =============================================
CREATE TABLE public.payment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2), -- null = customer enters amount
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  is_fixed_amount BOOLEAN NOT NULL DEFAULT true,
  min_amount DECIMAL(15, 2),
  max_amount DECIMAL(15, 2),
  redirect_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  total_collected DECIMAL(15, 2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Policies for payment_links
CREATE POLICY "Business owners can manage their payment links"
  ON public.payment_links FOR ALL
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active payment links"
  ON public.payment_links FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- =============================================
-- COLLECTIONS (incoming payments)
-- =============================================
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.business_wallets(id),
  collection_type collection_type NOT NULL,
  payment_link_id UUID REFERENCES public.payment_links(id),
  invoice_id UUID REFERENCES public.invoices(id),
  bulk_collection_id UUID, -- for bulk collections
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  payer_name VARCHAR(255),
  payer_email VARCHAR(255),
  payer_phone VARCHAR(20),
  provider_id UUID REFERENCES public.payment_providers(id),
  provider_reference VARCHAR(255),
  reference VARCHAR(100) UNIQUE NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Policies for collections
CREATE POLICY "Business owners can view their collections"
  ON public.collections FOR SELECT
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Business owners can create collections"
  ON public.collections FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- =============================================
-- BULK COLLECTIONS
-- =============================================
CREATE TABLE public.bulk_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  collected_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, processing, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their bulk collections"
  ON public.bulk_collections FOR ALL
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- Add foreign key for bulk_collection_id in collections
ALTER TABLE public.collections
  ADD CONSTRAINT fk_bulk_collection
  FOREIGN KEY (bulk_collection_id) REFERENCES public.bulk_collections(id) ON DELETE SET NULL;

-- =============================================
-- BENEFICIARIES (saved payout recipients)
-- =============================================
CREATE TABLE public.beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(255),
  provider_id UUID REFERENCES public.payment_providers(id),
  bank_code VARCHAR(20),
  bank_name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their beneficiaries"
  ON public.beneficiaries FOR ALL
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- =============================================
-- DISBURSEMENTS (outgoing payments)
-- =============================================
CREATE TABLE public.disbursements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.business_wallets(id),
  beneficiary_id UUID REFERENCES public.beneficiaries(id),
  bulk_payout_id UUID, -- for bulk payouts
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  recipient_name VARCHAR(255) NOT NULL,
  recipient_account VARCHAR(50) NOT NULL,
  recipient_bank_code VARCHAR(20),
  recipient_bank_name VARCHAR(100),
  recipient_phone VARCHAR(20),
  provider_id UUID REFERENCES public.payment_providers(id),
  provider_reference VARCHAR(255),
  reference VARCHAR(100) UNIQUE NOT NULL,
  narration TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their disbursements"
  ON public.disbursements FOR ALL
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- =============================================
-- BULK PAYOUTS
-- =============================================
CREATE TABLE public.bulk_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_fees DECIMAL(15, 2) NOT NULL DEFAULT 0,
  disbursed_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, approved, processing, completed, cancelled
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their bulk payouts"
  ON public.bulk_payouts FOR ALL
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- Add foreign key for bulk_payout_id in disbursements
ALTER TABLE public.disbursements
  ADD CONSTRAINT fk_bulk_payout
  FOREIGN KEY (bulk_payout_id) REFERENCES public.bulk_payouts(id) ON DELETE SET NULL;

-- =============================================
-- SPLIT PAYMENT RULES
-- =============================================
CREATE TABLE public.split_payment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to_all BOOLEAN NOT NULL DEFAULT false, -- applies to all collections
  payment_link_ids UUID[] DEFAULT '{}', -- specific payment links
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.split_payment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their split rules"
  ON public.split_payment_rules FOR ALL
  USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- =============================================
-- SPLIT PAYMENT RECIPIENTS
-- =============================================
CREATE TABLE public.split_payment_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  split_rule_id UUID NOT NULL REFERENCES public.split_payment_rules(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id),
  recipient_name VARCHAR(255) NOT NULL,
  recipient_account VARCHAR(50) NOT NULL,
  recipient_bank_code VARCHAR(20),
  split_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  split_value DECIMAL(15, 4) NOT NULL,
  is_remainder BOOLEAN NOT NULL DEFAULT false, -- receives remainder after all others
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.split_payment_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage split recipients"
  ON public.split_payment_recipients FOR SELECT
  USING (split_rule_id IN (
    SELECT id FROM public.split_payment_rules
    WHERE business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid())
  ));

-- =============================================
-- WALLET TOP-UPS
-- =============================================
CREATE TABLE public.wallet_topups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.business_wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  provider_id UUID REFERENCES public.payment_providers(id),
  provider_reference VARCHAR(255),
  reference VARCHAR(100) UNIQUE NOT NULL,
  source_account VARCHAR(50),
  source_bank VARCHAR(100),
  status transaction_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their topups"
  ON public.wallet_topups FOR ALL
  USING (wallet_id IN (
    SELECT w.id FROM public.business_wallets w
    JOIN public.business_profiles bp ON w.business_id = bp.id
    WHERE bp.user_id = auth.uid()
  ));

-- =============================================
-- WALLET WITHDRAWALS
-- =============================================
CREATE TABLE public.wallet_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.business_wallets(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id),
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  provider_id UUID REFERENCES public.payment_providers(id),
  provider_reference VARCHAR(255),
  reference VARCHAR(100) UNIQUE NOT NULL,
  destination_account VARCHAR(50) NOT NULL,
  destination_bank VARCHAR(100),
  destination_name VARCHAR(255),
  status transaction_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their withdrawals"
  ON public.wallet_withdrawals FOR ALL
  USING (wallet_id IN (
    SELECT w.id FROM public.business_wallets w
    JOIN public.business_profiles bp ON w.business_id = bp.id
    WHERE bp.user_id = auth.uid()
  ));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Generate unique reference for transactions
CREATE OR REPLACE FUNCTION public.generate_transaction_reference(prefix TEXT DEFAULT 'TXN')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_ref TEXT;
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  new_ref := prefix || '-' || timestamp_part || '-' || random_part;
  RETURN new_ref;
END;
$function$;

-- Generate payment link short code
CREATE OR REPLACE FUNCTION public.generate_payment_link_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.payment_links WHERE short_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$function$;

-- Auto-create wallet for new business
CREATE OR REPLACE FUNCTION public.auto_create_business_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.business_wallets (business_id, currency)
  VALUES (NEW.id, COALESCE(NEW.currency, 'GHS'))
  ON CONFLICT (business_id, currency) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Trigger to auto-create wallet
CREATE TRIGGER trigger_auto_create_wallet
AFTER INSERT ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_business_wallet();

-- Update timestamps trigger
CREATE TRIGGER update_business_wallets_updated_at
BEFORE UPDATE ON public.business_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_links_updated_at
BEFORE UPDATE ON public.payment_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiaries_updated_at
BEFORE UPDATE ON public.beneficiaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bulk_collections_updated_at
BEFORE UPDATE ON public.bulk_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bulk_payouts_updated_at
BEFORE UPDATE ON public.bulk_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_split_payment_rules_updated_at
BEFORE UPDATE ON public.split_payment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_providers_updated_at
BEFORE UPDATE ON public.payment_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();