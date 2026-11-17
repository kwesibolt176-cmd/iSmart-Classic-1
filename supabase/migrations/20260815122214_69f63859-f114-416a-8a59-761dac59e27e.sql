CREATE POLICY "Merchant owners can create branch assignments"
ON public.branch_inventory_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = location_id AND l.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.inventory_items i
    WHERE i.id = inventory_item_id AND i.user_id = auth.uid()
  )
);

CREATE POLICY "Merchant owners can update branch assignments"
ON public.branch_inventory_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = location_id AND l.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.inventory_items i
    WHERE i.id = inventory_item_id AND i.user_id = auth.uid()
  )
)
WITH CHECK (
  assigned_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = location_id AND l.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.inventory_items i
    WHERE i.id = inventory_item_id AND i.user_id = auth.uid()
  )
);

CREATE POLICY "Merchant owners can delete branch assignments"
ON public.branch_inventory_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = location_id AND l.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.inventory_items i
    WHERE i.id = inventory_item_id AND i.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id);