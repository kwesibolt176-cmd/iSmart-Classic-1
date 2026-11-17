-- Barcodes were globally unique across ALL merchants; scope them per merchant instead
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_barcode_key;
DROP INDEX IF EXISTS public.inventory_items_barcode_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_user_barcode
  ON public.inventory_items (user_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_user_name_location
  ON public.inventory_items (user_id, lower(name), coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_user_sku
  ON public.inventory_items (user_id, lower(sku))
  WHERE sku IS NOT NULL AND sku <> '';