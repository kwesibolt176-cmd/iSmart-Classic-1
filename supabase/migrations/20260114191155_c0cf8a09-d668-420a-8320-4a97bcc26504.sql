-- Add receipt_width column to business_profiles for POS thermal printer size
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS receipt_width VARCHAR(10) DEFAULT '80mm';

-- Add comment for clarity
COMMENT ON COLUMN public.business_profiles.receipt_width IS 'Thermal receipt printer width: 58mm or 80mm';