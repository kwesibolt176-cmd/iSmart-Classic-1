-- Create impersonation_sessions table for secure server-side session tracking
CREATE TABLE public.impersonation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_user_email TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage impersonation sessions
CREATE POLICY "Super admins can view all impersonation sessions"
ON public.impersonation_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can create impersonation sessions"
ON public.impersonation_sessions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') AND admin_user_id = auth.uid());

CREATE POLICY "Super admins can update their own sessions"
ON public.impersonation_sessions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') AND admin_user_id = auth.uid());

-- Create index for quick lookups
CREATE INDEX idx_impersonation_sessions_active ON public.impersonation_sessions(admin_user_id, is_active) WHERE is_active = true;