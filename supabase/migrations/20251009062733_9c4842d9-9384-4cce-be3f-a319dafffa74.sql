-- Add category_id column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;