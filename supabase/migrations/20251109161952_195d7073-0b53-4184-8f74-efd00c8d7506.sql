-- Function to deduct inventory when order is completed
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  order_item RECORD;
BEGIN
  -- Only process if status changed to 'completed' or 'delivered'
  IF (TG_OP = 'UPDATE' AND 
      OLD.status != NEW.status AND 
      (NEW.status = 'completed' OR NEW.status = 'delivered')) THEN
    
    -- Loop through all order items for this order
    FOR order_item IN 
      SELECT inventory_item_id, quantity, name
      FROM public.order_items
      WHERE order_id = NEW.id AND inventory_item_id IS NOT NULL
    LOOP
      -- Deduct the quantity from inventory
      UPDATE public.inventory_items
      SET quantity = quantity - order_item.quantity,
          updated_at = now()
      WHERE id = order_item.inventory_item_id
        AND user_id = NEW.user_id;
      
      -- Log the inventory change
      INSERT INTO public.inventory_history (
        user_id,
        inventory_item_id,
        action,
        quantity_before,
        quantity_after,
        reason,
        changed_by
      )
      SELECT 
        NEW.user_id,
        order_item.inventory_item_id,
        'deducted',
        ii.quantity + order_item.quantity,
        ii.quantity,
        'Order ' || NEW.order_number || ' completed',
        NEW.user_id
      FROM public.inventory_items ii
      WHERE ii.id = order_item.inventory_item_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_completion ON public.orders;
CREATE TRIGGER trigger_deduct_inventory_on_completion
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_order_completion();

-- Also add trigger to log_inventory_change if not exists
DROP TRIGGER IF EXISTS trigger_log_inventory_changes ON public.inventory_items;
CREATE TRIGGER trigger_log_inventory_changes
  AFTER INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_change();