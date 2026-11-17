-- Create promo_codes table for storefront promotions
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC(10,2) NOT NULL,
  message TEXT,
  variant VARCHAR(20) DEFAULT 'default', -- 'default', 'flash', 'seasonal'
  min_order_amount NUMERIC(10,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  show_on_storefront BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_promo_code_per_user UNIQUE (user_id, code)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own promo codes"
ON public.promo_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own promo codes"
ON public.promo_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own promo codes"
ON public.promo_codes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own promo codes"
ON public.promo_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Public can view active storefront promo codes
CREATE POLICY "Public can view active storefront promo codes"
ON public.promo_codes
FOR SELECT
USING (is_active = true AND show_on_storefront = true AND (expires_at IS NULL OR expires_at > now()));

-- Trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();