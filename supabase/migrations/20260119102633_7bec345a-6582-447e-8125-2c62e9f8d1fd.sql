-- Add trial usage tracking columns to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_services_used JSONB DEFAULT '{"sms": 0, "email": 0, "orders": 0, "invoices": 0}'::jsonb;

-- Create a view for super admin trial tracking
CREATE OR REPLACE VIEW public.trial_usage_summary AS
SELECT 
  us.id,
  us.user_id,
  bp.business_name,
  bp.industry,
  us.is_trial,
  us.trial_used_at,
  us.trial_services_used,
  us.status,
  us.current_period_start,
  us.current_period_end,
  us.sms_usage,
  us.email_usage,
  us.created_at
FROM public.user_subscriptions us
LEFT JOIN public.business_profiles bp ON us.user_id = bp.user_id
WHERE us.is_trial = true OR us.trial_used_at IS NOT NULL;

-- Create function to increment trial service usage
CREATE OR REPLACE FUNCTION public.increment_trial_service_usage(
  p_user_id UUID,
  p_service_type TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET trial_services_used = jsonb_set(
    COALESCE(trial_services_used, '{}'::jsonb),
    ARRAY[p_service_type],
    to_jsonb(COALESCE((trial_services_used->>p_service_type)::integer, 0) + p_count)
  ),
  updated_at = now()
  WHERE user_id = p_user_id AND (is_trial = true OR status = 'trialing');
END;
$$;