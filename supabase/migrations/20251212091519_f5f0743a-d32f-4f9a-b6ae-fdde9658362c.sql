-- Employee Scheduling: shifts table
CREATE TABLE public.employee_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shifts" ON public.employee_shifts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create shifts" ON public.employee_shifts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their shifts" ON public.employee_shifts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their shifts" ON public.employee_shifts FOR DELETE USING (auth.uid() = user_id);

-- Suppliers/Vendors table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their suppliers" ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create suppliers" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their suppliers" ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their suppliers" ON public.suppliers FOR DELETE USING (auth.uid() = user_id);

-- Supplier Orders (Purchase Orders)
CREATE TABLE public.supplier_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their supplier orders" ON public.supplier_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create supplier orders" ON public.supplier_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their supplier orders" ON public.supplier_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their supplier orders" ON public.supplier_orders FOR DELETE USING (auth.uid() = user_id);

-- Low Stock Alerts table
CREATE TABLE public.low_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'low_stock',
  current_quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their alerts" ON public.low_stock_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create alerts" ON public.low_stock_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their alerts" ON public.low_stock_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Customer Portal Sessions
CREATE TABLE public.customer_portal_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can validate sessions" ON public.customer_portal_sessions FOR SELECT USING (true);
CREATE POLICY "System can create sessions" ON public.customer_portal_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "System can delete sessions" ON public.customer_portal_sessions FOR DELETE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_employee_shifts_updated_at BEFORE UPDATE ON public.employee_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON public.supplier_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();