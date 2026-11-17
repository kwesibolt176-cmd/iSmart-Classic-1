-- Add deposit fields to reservations table
ALTER TABLE public.reservations
ADD COLUMN deposit_type TEXT CHECK (deposit_type IN ('fixed', 'percentage')),
ADD COLUMN deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN deposit_percentage NUMERIC DEFAULT 0,
ADD COLUMN deposit_status TEXT DEFAULT 'not_required' CHECK (deposit_status IN ('not_required', 'pending', 'paid', 'refunded')),
ADD COLUMN deposit_paid_amount NUMERIC DEFAULT 0,
ADD COLUMN deposit_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deposit_payment_method TEXT,
ADD COLUMN deposit_payment_link TEXT,
ADD COLUMN deposit_payment_link_expires_at TIMESTAMP WITH TIME ZONE;