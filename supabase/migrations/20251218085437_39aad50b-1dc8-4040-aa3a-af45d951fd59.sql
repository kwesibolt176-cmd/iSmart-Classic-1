-- Add is_suspended column to business_profiles if not exists
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;