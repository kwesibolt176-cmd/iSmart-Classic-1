-- Add image_url column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- Add description column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS description TEXT NULL;