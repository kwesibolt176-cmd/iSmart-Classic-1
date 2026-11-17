-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Users can view their locations"
  ON public.locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their locations"
  ON public.locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their locations"
  ON public.locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their locations"
  ON public.locations FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add location_id to relevant tables
ALTER TABLE public.orders ADD COLUMN location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.inventory_items ADD COLUMN location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.staff ADD COLUMN location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.transactions ADD COLUMN location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.restaurant_tables ADD COLUMN location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.reservations ADD COLUMN location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.expenses ADD COLUMN location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.refunds ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- Create indexes for performance
CREATE INDEX idx_locations_user_id ON public.locations(user_id);
CREATE INDEX idx_locations_is_default ON public.locations(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_orders_location_id ON public.orders(location_id);
CREATE INDEX idx_inventory_items_location_id ON public.inventory_items(location_id);
CREATE INDEX idx_staff_location_id ON public.staff(location_id);
CREATE INDEX idx_transactions_location_id ON public.transactions(location_id);
CREATE INDEX idx_restaurant_tables_location_id ON public.restaurant_tables(location_id);
CREATE INDEX idx_reservations_location_id ON public.reservations(location_id);
CREATE INDEX idx_expenses_location_id ON public.expenses(location_id);
CREATE INDEX idx_refunds_location_id ON public.refunds(location_id);

-- Function to ensure only one default location per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.locations
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_default_location_trigger
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_location();