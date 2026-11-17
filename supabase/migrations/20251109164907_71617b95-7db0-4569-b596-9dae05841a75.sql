-- Add missing business profile fields
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS settlement_account TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;