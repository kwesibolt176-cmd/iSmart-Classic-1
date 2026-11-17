-- Add settlement type and provider fields
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS settlement_type TEXT CHECK (settlement_type IN ('bank', 'momo')),
ADD COLUMN IF NOT EXISTS settlement_provider TEXT;