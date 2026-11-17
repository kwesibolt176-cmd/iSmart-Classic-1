-- Add email_sent column to low_stock_alerts if it doesn't exist
ALTER TABLE public.low_stock_alerts 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item_resolved 
ON public.low_stock_alerts(inventory_item_id, is_resolved);