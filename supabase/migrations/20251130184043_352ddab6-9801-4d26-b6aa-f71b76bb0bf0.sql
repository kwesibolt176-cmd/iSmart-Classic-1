-- Create product_variants table
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  variant_name TEXT NOT NULL,
  sku TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  price_adjustment NUMERIC DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their product variants"
  ON public.product_variants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their product variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their product variants"
  ON public.product_variants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their product variants"
  ON public.product_variants FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_product_variants_inventory_item_id ON public.product_variants(inventory_item_id);
CREATE INDEX idx_product_variants_location_id ON public.product_variants(location_id);
CREATE INDEX idx_product_variants_user_id ON public.product_variants(user_id);

-- Add has_variants flag to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN has_variants BOOLEAN NOT NULL DEFAULT false;

-- Create variant history table for tracking changes
CREATE TABLE public.variant_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  price_before NUMERIC,
  price_after NUMERIC,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for variant history
ALTER TABLE public.variant_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their variant history"
  ON public.variant_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert variant history"
  ON public.variant_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to log variant changes
CREATE OR REPLACE FUNCTION public.log_variant_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.variant_history (
      user_id, variant_id, action, quantity_after, price_after, changed_by
    ) VALUES (
      NEW.user_id, NEW.id, 'created', NEW.quantity, NEW.price_adjustment, auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.quantity != NEW.quantity OR OLD.price_adjustment != NEW.price_adjustment THEN
      INSERT INTO public.variant_history (
        user_id, variant_id, action, 
        quantity_before, quantity_after, 
        price_before, price_after, 
        changed_by
      ) VALUES (
        NEW.user_id, NEW.id, 'updated',
        OLD.quantity, NEW.quantity,
        OLD.price_adjustment, NEW.price_adjustment,
        auth.uid()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_variant_changes
  AFTER INSERT OR UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.log_variant_change();