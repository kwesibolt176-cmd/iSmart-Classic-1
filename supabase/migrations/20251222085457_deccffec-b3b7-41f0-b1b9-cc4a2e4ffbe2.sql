-- Create ingredients table for raw materials
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  quantity NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  low_stock_threshold NUMERIC DEFAULT 10,
  supplier_id UUID REFERENCES public.suppliers(id),
  location_id UUID REFERENCES public.locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dish_ingredients (recipes) table linking dishes to ingredients
CREATE TABLE public.dish_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_required NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'g',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(inventory_item_id, ingredient_id)
);

-- Add track_inventory column to inventory_items to distinguish dishes from tracked products
ALTER TABLE public.inventory_items ADD COLUMN track_inventory BOOLEAN NOT NULL DEFAULT true;

-- Enable RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies for ingredients
CREATE POLICY "Users can view their ingredients" ON public.ingredients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create ingredients" ON public.ingredients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their ingredients" ON public.ingredients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their ingredients" ON public.ingredients
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for dish_ingredients
CREATE POLICY "Users can view their dish ingredients" ON public.dish_ingredients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create dish ingredients" ON public.dish_ingredients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their dish ingredients" ON public.dish_ingredients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their dish ingredients" ON public.dish_ingredients
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dish_ingredients_updated_at
  BEFORE UPDATE ON public.dish_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to deduct ingredients when an order is completed
CREATE OR REPLACE FUNCTION public.deduct_ingredients_on_order_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_item RECORD;
  dish_ingredient RECORD;
BEGIN
  IF (TG_OP = 'UPDATE' AND 
      OLD.status != NEW.status AND 
      (NEW.status = 'completed' OR NEW.status = 'delivered')) THEN
    
    FOR order_item IN 
      SELECT oi.inventory_item_id, oi.quantity, ii.track_inventory
      FROM public.order_items oi
      JOIN public.inventory_items ii ON ii.id = oi.inventory_item_id
      WHERE oi.order_id = NEW.id AND oi.inventory_item_id IS NOT NULL
    LOOP
      -- If dish doesn't track inventory, deduct from ingredients instead
      IF NOT order_item.track_inventory THEN
        FOR dish_ingredient IN
          SELECT di.ingredient_id, di.quantity_required
          FROM public.dish_ingredients di
          WHERE di.inventory_item_id = order_item.inventory_item_id
        LOOP
          UPDATE public.ingredients
          SET quantity = quantity - (dish_ingredient.quantity_required * order_item.quantity),
              updated_at = now()
          WHERE id = dish_ingredient.ingredient_id
            AND user_id = NEW.user_id;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ingredient deduction
CREATE TRIGGER deduct_ingredients_on_order
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_ingredients_on_order_completion();