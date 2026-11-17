-- Create a Free Trial plan (30 days)
INSERT INTO subscription_plans (
  id,
  name,
  description,
  price_monthly,
  price_yearly,
  features,
  sms_limit,
  email_limit,
  display_order,
  is_active
) VALUES (
  gen_random_uuid(),
  'Free Trial',
  'Experience all Professional features free for 30 days',
  0,
  0,
  '["30 days free access", "Up to 5,000 transactions", "Full inventory management", "Email & chat support", "Up to 3 user accounts", "Reports & analytics", "SMS campaigns (limited)", "Email campaigns", "200 SMS credits", "1,000 Email credits"]'::jsonb,
  200,
  1000,
  0,
  true
);

-- Create referral_signups table to track users who came through promo links
CREATE TABLE public.referral_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own referral record
CREATE POLICY "Users can view their own referral" 
ON public.referral_signups 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for inserting during signup (allow anyone to insert with their own user_id)
CREATE POLICY "Users can insert their own referral" 
ON public.referral_signups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add is_trial column to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

-- Add referral_code column to user_subscriptions  
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS referral_code TEXT;