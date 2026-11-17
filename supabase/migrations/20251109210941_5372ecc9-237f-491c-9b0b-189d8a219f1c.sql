-- Add admin PIN column to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN admin_pin TEXT CHECK (admin_pin IS NULL OR (admin_pin ~ '^\d{4}$'));

-- Set default admin PIN to 1234
UPDATE public.business_profiles 
SET admin_pin = '1234' 
WHERE admin_pin IS NULL;

-- Add comment explaining the admin PIN
COMMENT ON COLUMN public.business_profiles.admin_pin IS 'Master 4-digit PIN for admin quick access (0000-9999)';