
CREATE INDEX IF NOT EXISTS idx_inventory_history_item ON public.inventory_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory_item ON public.order_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON public.inventory_items(user_id);
