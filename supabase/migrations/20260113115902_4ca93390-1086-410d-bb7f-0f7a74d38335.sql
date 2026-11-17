-- Add storefront visibility column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS show_on_storefront BOOLEAN DEFAULT false;

-- Add slug for URL-friendly product pages
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index for slug per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_user_slug 
ON public.inventory_items(user_id, slug) 
WHERE slug IS NOT NULL;

-- Create index for storefront queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_storefront 
ON public.inventory_items(user_id, show_on_storefront, is_active);

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_inventory_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate slug if not provided and show_on_storefront is true
  IF NEW.slug IS NULL AND NEW.show_on_storefront = true THEN
    base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    new_slug := base_slug;
    
    -- Check for uniqueness
    WHILE EXISTS (
      SELECT 1 FROM public.inventory_items 
      WHERE user_id = NEW.user_id 
      AND slug = new_slug 
      AND id != NEW.id
    ) LOOP
      counter := counter + 1;
      new_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := new_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate slug
CREATE TRIGGER generate_inventory_slug_trigger
BEFORE INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.generate_inventory_slug();

-- Update existing social_media_products links: migrate data to inventory_items
-- For items that have inventory_item_id, update the inventory item to show on storefront
UPDATE public.inventory_items ii
SET show_on_storefront = true
FROM public.social_media_products smp
WHERE smp.inventory_item_id = ii.id
AND smp.is_active = true;