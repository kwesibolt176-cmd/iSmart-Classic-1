-- Create communication_logs table for tracking all sent messages
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_id UUID REFERENCES public.pending_actions(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all communication logs" 
ON public.communication_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Users can view their own logs
CREATE POLICY "Users can view own communication logs"
ON public.communication_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Allow inserts from authenticated users
CREATE POLICY "Allow inserts for authenticated users"
ON public.communication_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_communication_logs_user_id ON public.communication_logs(user_id);
CREATE INDEX idx_communication_logs_channel ON public.communication_logs(channel);
CREATE INDEX idx_communication_logs_created_at ON public.communication_logs(created_at DESC);

-- Add communication settings to system_settings if not exists
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('communication_auto_execute', '{"enabled": false}', 'Auto-execute communications without approval'),
  ('email_channel', '{"enabled": true, "from_name": "Business System", "from_email": "onboarding@resend.dev"}', 'Email channel configuration'),
  ('sms_channel', '{"enabled": true}', 'SMS channel configuration')
ON CONFLICT (setting_key) DO NOTHING;