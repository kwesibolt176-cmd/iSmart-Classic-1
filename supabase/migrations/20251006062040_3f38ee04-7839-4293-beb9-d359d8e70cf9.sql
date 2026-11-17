-- Create enum for industry types
CREATE TYPE public.industry_type AS ENUM (
  'restaurant',
  'retail',
  'salon',
  'gym',
  'healthcare',
  'services'
);

-- Create business_profiles table
CREATE TABLE public.business_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  industry industry_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own business profile"
ON public.business_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business profile"
ON public.business_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
ON public.business_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create feature_settings table
CREATE TABLE public.feature_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tables_enabled BOOLEAN NOT NULL DEFAULT true,
  reservations_enabled BOOLEAN NOT NULL DEFAULT true,
  kitchen_enabled BOOLEAN NOT NULL DEFAULT true,
  inventory_enabled BOOLEAN NOT NULL DEFAULT true,
  staff_enabled BOOLEAN NOT NULL DEFAULT true,
  customers_enabled BOOLEAN NOT NULL DEFAULT true,
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  reports_enabled BOOLEAN NOT NULL DEFAULT true,
  accounting_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own feature settings"
ON public.feature_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feature settings"
ON public.feature_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature settings"
ON public.feature_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_settings_updated_at
BEFORE UPDATE ON public.feature_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();