-- Create ordering station groups table
CREATE TABLE public.ordering_station_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location_id UUID REFERENCES public.locations(id),
  is_active BOOLEAN DEFAULT true,
  auto_assign_station BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ordering stations table
CREATE TABLE public.ordering_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.ordering_station_groups(id) ON DELETE CASCADE,
  station_name TEXT NOT NULL,
  station_number INTEGER NOT NULL,
  qr_code_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create self-serve orders table
CREATE TABLE public.self_serve_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_user_id UUID NOT NULL,
  station_id UUID REFERENCES public.ordering_stations(id),
  order_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ordering_station_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordering_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_serve_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for ordering_station_groups
CREATE POLICY "Users can view their own station groups" 
ON public.ordering_station_groups FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own station groups" 
ON public.ordering_station_groups FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own station groups" 
ON public.ordering_station_groups FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own station groups" 
ON public.ordering_station_groups FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for ordering_stations
CREATE POLICY "Users can view their own stations" 
ON public.ordering_stations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stations" 
ON public.ordering_stations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stations" 
ON public.ordering_stations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stations" 
ON public.ordering_stations FOR DELETE USING (auth.uid() = user_id);

-- Public access for QR code lookup
CREATE POLICY "Public can view active stations by token" 
ON public.ordering_stations FOR SELECT USING (is_active = true);

-- RLS policies for self_serve_orders
CREATE POLICY "Business owners can view their orders" 
ON public.self_serve_orders FOR SELECT USING (auth.uid() = business_user_id);

CREATE POLICY "Public can create orders" 
ON public.self_serve_orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Business owners can update their orders" 
ON public.self_serve_orders FOR UPDATE USING (auth.uid() = business_user_id);

-- Triggers for updated_at
CREATE TRIGGER update_ordering_station_groups_updated_at
BEFORE UPDATE ON public.ordering_station_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ordering_stations_updated_at
BEFORE UPDATE ON public.ordering_stations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_self_serve_orders_updated_at
BEFORE UPDATE ON public.self_serve_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for self-serve orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.self_serve_orders;