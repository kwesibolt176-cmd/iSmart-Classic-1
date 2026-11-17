-- Add customer_id foreign key to orders table for purchase history tracking
ALTER TABLE public.orders 
ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);