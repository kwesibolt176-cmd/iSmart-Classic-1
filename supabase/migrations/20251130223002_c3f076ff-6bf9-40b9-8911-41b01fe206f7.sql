-- Create feature_flags table for tier-based feature control
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  enabled_for_tiers TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create support_tickets table for help desk
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category TEXT NOT NULL,
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create support_ticket_messages table for ticket conversations
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create promotional_credits table
CREATE TABLE IF NOT EXISTS public.promotional_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  credit_amount NUMERIC NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('sms', 'email', 'subscription', 'general')),
  reason TEXT,
  expires_at TIMESTAMPTZ,
  used_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create platform_announcements table
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL CHECK (announcement_type IN ('info', 'warning', 'maintenance', 'feature', 'promotion')),
  target_tiers TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_activity_logs table for tracking business activities
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_flags (super admin only)
CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all tickets"
  ON public.support_tickets
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for support_ticket_messages
CREATE POLICY "Users can view messages for their tickets"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all messages"
  ON public.support_ticket_messages
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for promotional_credits
CREATE POLICY "Users can view their own credits"
  ON public.promotional_credits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all credits"
  ON public.promotional_credits
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for platform_announcements
CREATE POLICY "Super admins can manage announcements"
  ON public.platform_announcements
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view active announcements"
  ON public.platform_announcements
  FOR SELECT
  USING (is_active = true AND now() BETWEEN starts_at AND COALESCE(ends_at, 'infinity'::timestamptz));

-- RLS Policies for user_activity_logs
CREATE POLICY "Super admins can view all activity logs"
  ON public.user_activity_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert activity logs"
  ON public.user_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
CREATE INDEX idx_promotional_credits_user_id ON public.promotional_credits(user_id);
CREATE INDEX idx_promotional_credits_status ON public.promotional_credits(status);
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_business_id ON public.user_activity_logs(business_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at);

-- Add update triggers
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotional_credits_updated_at
  BEFORE UPDATE ON public.promotional_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_announcements_updated_at
  BEFORE UPDATE ON public.platform_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();