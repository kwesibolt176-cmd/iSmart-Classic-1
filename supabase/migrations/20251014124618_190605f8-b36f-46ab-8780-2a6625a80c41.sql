-- Phase 1: Add tendered amount and change due to transactions
ALTER TABLE public.transactions
ADD COLUMN tendered_amount numeric,
ADD COLUMN change_due numeric;

-- Add index on customer_phone for faster order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_user_phone ON public.orders(user_id, customer_phone);

-- Phase 3: Create refunds table
CREATE TABLE public.refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  order_id uuid,
  refund_amount numeric NOT NULL,
  refund_type text NOT NULL CHECK (refund_type IN ('full', 'partial')),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  approved_by uuid,
  approved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their refunds"
ON public.refunds FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create refund requests"
ON public.refunds FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update refunds"
ON public.refunds FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete refunds"
ON public.refunds FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL,
  price_yearly numeric,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sms_limit integer,
  email_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  sms_usage integer DEFAULT 0,
  email_usage integer DEFAULT 0,
  stripe_subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their subscriptions"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create subscriptions"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their subscriptions"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Add plan_tier to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN plan_tier text DEFAULT 'free' CHECK (plan_tier IN ('free', 'basic', 'pro', 'enterprise'));

-- Create social media products table
CREATE TABLE public.social_media_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  inventory_item_id uuid,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  stock_quantity integer,
  slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

ALTER TABLE public.social_media_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their social media products"
ON public.social_media_products FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active products"
ON public.social_media_products FOR SELECT
USING (is_active = true);

-- Create social media orders table
CREATE TABLE public.social_media_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL,
  delivery_address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.social_media_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their social media orders"
ON public.social_media_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create social media orders"
ON public.social_media_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their social media orders"
ON public.social_media_orders FOR UPDATE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON public.refunds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_products_updated_at
BEFORE UPDATE ON public.social_media_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_orders_updated_at
BEFORE UPDATE ON public.social_media_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features, sms_limit, email_limit, display_order) VALUES
('Free', 'Perfect for trying out', 0, 0, '["Basic POS features", "Up to 10 SMS/month", "Up to 50 orders/month", "Email support"]'::jsonb, 10, 50, 1),
('Basic', 'For small businesses', 29, 290, '["All Free features", "Up to 100 SMS/month", "Unlimited orders", "Phone support", "Basic analytics"]'::jsonb, 100, 500, 2),
('Pro', 'For growing businesses', 79, 790, '["All Basic features", "Up to 500 SMS/month", "Advanced analytics", "Priority support", "Custom branding", "Bulk SMS campaigns"]'::jsonb, 500, 2000, 3),
('Enterprise', 'For large operations', 199, 1990, '["All Pro features", "Unlimited SMS", "Multi-location support", "API access", "Dedicated support", "Custom integrations"]'::jsonb, -1, -1, 4);