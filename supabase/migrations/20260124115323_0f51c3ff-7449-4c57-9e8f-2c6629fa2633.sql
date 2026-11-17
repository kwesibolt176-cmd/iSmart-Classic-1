-- Create table to store 2FA settings for users
CREATE TABLE public.user_two_factor_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    totp_secret TEXT, -- Encrypted TOTP secret
    is_enabled BOOLEAN DEFAULT false,
    backup_codes TEXT[], -- Encrypted backup codes
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Users can only view/update their own 2FA settings
CREATE POLICY "Users can view their own 2FA settings"
ON public.user_two_factor_auth
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings"
ON public.user_two_factor_auth
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings"
ON public.user_two_factor_auth
FOR UPDATE
USING (auth.uid() = user_id);

-- Super admins can view all 2FA status (not secrets)
CREATE POLICY "Super admins can view 2FA status"
ON public.user_two_factor_auth
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create index for faster lookups
CREATE INDEX idx_user_two_factor_auth_user_id ON public.user_two_factor_auth(user_id);

-- Function to check if a user has 2FA enabled
CREATE OR REPLACE FUNCTION public.has_2fa_enabled(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_enabled FROM public.user_two_factor_auth WHERE user_id = _user_id),
        false
    )
$$;

-- Function to check if super admin requires 2FA verification
CREATE OR REPLACE FUNCTION public.super_admin_requires_2fa(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.has_role(_user_id, 'super_admin') 
        AND public.has_2fa_enabled(_user_id)
$$;