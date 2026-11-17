-- Add additional columns for storefront gift card purchases
ALTER TABLE public.gift_cards 
ADD COLUMN IF NOT EXISTS purchased_by_name TEXT,
ADD COLUMN IF NOT EXISTS purchased_by_phone TEXT,
ADD COLUMN IF NOT EXISTS purchased_by_email TEXT,
ADD COLUMN IF NOT EXISTS personal_message TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pos';

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_gift_cards_source ON public.gift_cards(source);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow anonymous gift card reads for validation" ON public.gift_cards;

-- Create policy for anonymous gift card reads (for validation during checkout)
CREATE POLICY "Allow anonymous gift card reads for validation"
ON public.gift_cards FOR SELECT
USING (status = 'active');