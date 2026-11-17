-- Add PIN column to staff table
ALTER TABLE public.staff 
ADD COLUMN pin TEXT CHECK (pin IS NULL OR (pin ~ '^\d{4}$'));

-- Add comment explaining the PIN format
COMMENT ON COLUMN public.staff.pin IS 'Optional 4-digit PIN for staff authentication (0000-9999)';