
-- Create table for tracking storefront visits
CREATE TABLE public.storefront_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_user_id UUID NOT NULL,
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  device_type TEXT,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_storefront_visits_business ON public.storefront_visits(business_user_id);
CREATE INDEX idx_storefront_visits_date ON public.storefront_visits(visited_at);

-- Enable RLS
ALTER TABLE public.storefront_visits ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (visitors are anonymous)
CREATE POLICY "Anyone can record visits"
ON public.storefront_visits
FOR INSERT
WITH CHECK (true);

-- Only super admins can view all visits
CREATE POLICY "Super admins can view all visits"
ON public.storefront_visits
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Business owners can view their own visits
CREATE POLICY "Business owners can view their visits"
ON public.storefront_visits
FOR SELECT
USING (auth.uid() = business_user_id);
