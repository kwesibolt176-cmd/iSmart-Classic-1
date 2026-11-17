-- Add tracking and delivery fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Add barcode field to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Create index for barcode lookup
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON public.inventory_items(barcode) WHERE barcode IS NOT NULL;

-- Add comment for barcode field
COMMENT ON COLUMN public.inventory_items.barcode IS 'Barcode/QR code for inventory item scanning';