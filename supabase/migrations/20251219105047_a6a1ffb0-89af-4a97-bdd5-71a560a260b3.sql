-- Create system_settings table for super admin settings
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage system settings
CREATE POLICY "Super admins can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert system settings"
ON public.system_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update system settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete system settings"
ON public.system_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create api_keys table for API management
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  rate_limit integer NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  requests_today integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all API keys
CREATE POLICY "Super admins can manage api keys"
ON public.api_keys FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Business owners can view their own API keys
CREATE POLICY "Users can view their api keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- Create webhooks table
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret_hash text,
  is_active boolean NOT NULL DEFAULT true,
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  last_triggered_at timestamp with time zone,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all webhooks
CREATE POLICY "Super admins can manage webhooks"
ON public.webhooks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Business owners can manage their own webhooks
CREATE POLICY "Users can manage their webhooks"
ON public.webhooks FOR ALL
TO authenticated
USING (business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid()));

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('maintenance_mode', '{"enabled": false}', 'Platform maintenance mode'),
('signups_enabled', '{"enabled": true}', 'Allow new business registrations'),
('email_notifications', '{"enabled": true}', 'System email notifications'),
('sms_notifications', '{"enabled": true}', 'System SMS notifications'),
('limits', '{"max_users_per_business": 50, "session_timeout": 30, "api_rate_limit": 1000}', 'Platform limits and performance settings');