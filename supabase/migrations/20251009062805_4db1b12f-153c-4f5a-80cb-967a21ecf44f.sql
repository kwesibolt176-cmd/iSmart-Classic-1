-- Remove old category column from inventory_items
ALTER TABLE public.inventory_items DROP COLUMN IF EXISTS category;