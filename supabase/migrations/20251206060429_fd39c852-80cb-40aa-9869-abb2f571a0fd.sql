-- Create dedicated audit_logs table for comprehensive tracking
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- System can insert audit logs (authenticated users)
CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create business_fraud_exemptions table
CREATE TABLE public.business_fraud_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  fraud_rule_id UUID NOT NULL REFERENCES public.fraud_rules(id) ON DELETE CASCADE,
  exempted_by UUID NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, fraud_rule_id)
);

-- Create indexes
CREATE INDEX idx_business_fraud_exemptions_business_id ON public.business_fraud_exemptions(business_id);
CREATE INDEX idx_business_fraud_exemptions_rule_id ON public.business_fraud_exemptions(fraud_rule_id);

-- Enable RLS
ALTER TABLE public.business_fraud_exemptions ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage exemptions
CREATE POLICY "Super admins can manage fraud exemptions"
ON public.business_fraud_exemptions
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_business_fraud_exemptions_updated_at
BEFORE UPDATE ON public.business_fraud_exemptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();