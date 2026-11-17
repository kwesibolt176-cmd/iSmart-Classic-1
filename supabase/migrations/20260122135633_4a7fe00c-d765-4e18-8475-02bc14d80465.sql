-- Ghana Tax Engine: Tax Configuration, Transaction Records, and Audit Logs

-- 1. Tax Configuration Table (versioned, config-driven rates)
CREATE TABLE public.tax_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15,
  nhil_rate DECIMAL(5,4) NOT NULL DEFAULT 0.025,
  getfund_rate DECIMAL(5,4) NOT NULL DEFAULT 0.025,
  abolished_levies TEXT[] DEFAULT ARRAY['covid_health_recovery'],
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Insert current Ghana tax rates (2026)
INSERT INTO public.tax_configurations (version, vat_rate, nhil_rate, getfund_rate, effective_from, is_active)
VALUES ('2026-01', 0.15, 0.025, 0.025, '2026-01-01', true);

-- 2. Add VAT registration fields to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS tin VARCHAR(20),
ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(20) DEFAULT 'None' CHECK (tax_regime IN ('VAT', 'Presumptive', 'None')),
ADD COLUMN IF NOT EXISTS turnover_last_12_months DECIMAL(15,2) DEFAULT 0;

-- 3. Transaction Tax Records Table (per-transaction breakdown)
CREATE TABLE public.transaction_tax_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  net_amount DECIMAL(15,2) NOT NULL,
  nhil_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  getfund_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  gross_amount DECIMAL(15,2) NOT NULL,
  tax_rule_version VARCHAR(20) NOT NULL,
  vat_registered_at_time BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tax Audit Logs Table (immutable)
CREATE TABLE public.tax_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  tax_rule_version VARCHAR(20) NOT NULL,
  tax_components JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tax Aggregation Summary Table (for reporting)
CREATE TABLE public.tax_aggregation_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_sales DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_vat DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_nhil DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_getfund DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_type, period_start)
);

-- Enable RLS on all new tables
ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_aggregation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_configurations (read-only for authenticated users)
CREATE POLICY "Anyone can read active tax configurations"
ON public.tax_configurations FOR SELECT
USING (is_active = true);

-- RLS Policies for transaction_tax_records
CREATE POLICY "Users can view their own tax records"
ON public.transaction_tax_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tax records"
ON public.transaction_tax_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tax_audit_logs
CREATE POLICY "Users can view their own audit logs"
ON public.tax_audit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
ON public.tax_audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tax_aggregation_summaries
CREATE POLICY "Users can view their own tax summaries"
ON public.tax_aggregation_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tax summaries"
ON public.tax_aggregation_summaries FOR ALL
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_transaction_tax_records_user ON public.transaction_tax_records(user_id);
CREATE INDEX idx_transaction_tax_records_transaction ON public.transaction_tax_records(transaction_id);
CREATE INDEX idx_transaction_tax_records_computed_at ON public.transaction_tax_records(computed_at);
CREATE INDEX idx_tax_audit_logs_user ON public.tax_audit_logs(user_id);
CREATE INDEX idx_tax_audit_logs_transaction ON public.tax_audit_logs(transaction_id);
CREATE INDEX idx_tax_aggregation_summaries_user_period ON public.tax_aggregation_summaries(user_id, period_type, period_start);