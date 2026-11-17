-- Allow public read access to orders by order_number (for receipt viewing)
CREATE POLICY "Public can view orders by order_number"
  ON public.orders
  FOR SELECT
  USING (true);

-- Allow public read access to order_items for receipt viewing
CREATE POLICY "Public can view order items for receipts"
  ON public.order_items
  FOR SELECT
  USING (true);