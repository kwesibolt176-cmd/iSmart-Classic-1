-- Add staff tracking to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

-- Add order type to orders table for dining options
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_type text CHECK (order_type IN ('dine-in', 'takeout', 'delivery'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON public.transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);

COMMENT ON COLUMN public.transactions.staff_id IS 'Staff member who processed this transaction';
COMMENT ON COLUMN public.orders.order_type IS 'Type of order: dine-in, takeout, or delivery';