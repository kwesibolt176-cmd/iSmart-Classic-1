
-- Create delivery partners table (managed by super admin)
CREATE TABLE public.delivery_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  logo_url TEXT,
  description TEXT,
  supported_regions TEXT[],
  min_order_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery orders table
CREATE TABLE public.delivery_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivery_partner_id UUID REFERENCES public.delivery_partners(id),
  external_delivery_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  pickup_address TEXT NOT NULL,
  pickup_contact TEXT,
  pickup_phone TEXT,
  delivery_address TEXT NOT NULL,
  delivery_contact TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  delivery_notes TEXT,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  estimated_pickup_time TIMESTAMP WITH TIME ZONE,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_pickup_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  driver_name TEXT,
  driver_phone TEXT,
  tracking_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery status history for tracking
CREATE TABLE public.delivery_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_order_id UUID REFERENCES public.delivery_orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery activity logs for super admin
CREATE TABLE public.delivery_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_partner_id UUID REFERENCES public.delivery_partners(id),
  delivery_order_id UUID REFERENCES public.delivery_orders(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_activity_logs ENABLE ROW LEVEL SECURITY;

-- Delivery partners policies (super admin manages, everyone reads active)
CREATE POLICY "Anyone can view active delivery partners"
ON public.delivery_partners FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage delivery partners"
ON public.delivery_partners FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Delivery orders policies
CREATE POLICY "Users can view their own delivery orders"
ON public.delivery_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create delivery orders"
ON public.delivery_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own delivery orders"
ON public.delivery_orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all delivery orders"
ON public.delivery_orders FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Delivery status history policies
CREATE POLICY "Users can view status history for their deliveries"
ON public.delivery_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_orders
    WHERE id = delivery_order_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all status history"
ON public.delivery_status_history FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert status history"
ON public.delivery_status_history FOR INSERT
WITH CHECK (true);

-- Delivery activity logs policies (super admin only)
CREATE POLICY "Super admins can view delivery logs"
ON public.delivery_activity_logs FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert delivery logs"
ON public.delivery_activity_logs FOR INSERT
WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER update_delivery_partners_updated_at
BEFORE UPDATE ON public.delivery_partners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_orders_updated_at
BEFORE UPDATE ON public.delivery_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for delivery tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_status_history;
