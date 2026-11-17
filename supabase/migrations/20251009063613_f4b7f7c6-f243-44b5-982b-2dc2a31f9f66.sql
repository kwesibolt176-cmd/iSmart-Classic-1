-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_number TEXT NOT NULL,
  table_number INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'completed')),
  total NUMERIC NOT NULL DEFAULT 0,
  server TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  payment_link TEXT,
  payment_link_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
  ON public.orders FOR DELETE
  USING (auth.uid() = user_id);

-- Order items policies
CREATE POLICY "Users can view order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can update order items"
  ON public.order_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete order items"
  ON public.order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter
  FROM public.orders
  WHERE user_id = auth.uid()
  AND DATE(created_at) = CURRENT_DATE;
  
  new_number := '#' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$;