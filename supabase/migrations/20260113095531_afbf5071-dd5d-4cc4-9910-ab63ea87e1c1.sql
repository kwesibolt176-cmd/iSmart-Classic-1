-- Drop the overly restrictive INSERT policy for inventory_items
DROP POLICY IF EXISTS "Admins and inventory managers can insert items" ON public.inventory_items;

-- Create a simpler policy that allows users to insert their own items
CREATE POLICY "Users can insert their own inventory items"
ON public.inventory_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also fix the UPDATE policy to be simpler
DROP POLICY IF EXISTS "Admins and inventory managers can update items" ON public.inventory_items;

CREATE POLICY "Users can update their own inventory items"
ON public.inventory_items
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix DELETE policy too
DROP POLICY IF EXISTS "Admins can delete items" ON public.inventory_items;

CREATE POLICY "Users can delete their own inventory items"
ON public.inventory_items
FOR DELETE
USING (auth.uid() = user_id);