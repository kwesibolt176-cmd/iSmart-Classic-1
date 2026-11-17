-- Create feature announcement campaigns table
CREATE TABLE public.feature_announcement_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_tiers TEXT[] DEFAULT ARRAY[]::TEXT[],
  include_staff BOOLEAN DEFAULT true,
  recipients_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_announcement_campaigns ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage feature announcements
CREATE POLICY "Super admins can manage feature announcements"
ON public.feature_announcement_campaigns
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));