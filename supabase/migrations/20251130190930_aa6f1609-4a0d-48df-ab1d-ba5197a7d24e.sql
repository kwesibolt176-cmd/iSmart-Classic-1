-- Create loyalty tiers table
CREATE TABLE public.loyalty_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  max_points INTEGER,
  benefits JSONB DEFAULT '[]'::jsonb,
  discount_percentage NUMERIC DEFAULT 0,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loyalty rewards table
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_reward_type CHECK (reward_type IN ('discount', 'free_item', 'service', 'gift'))
);

-- Create customer loyalty points table
CREATE TABLE public.customer_loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  current_tier_id UUID REFERENCES public.loyalty_tiers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_id)
);

-- Create loyalty transactions table
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  points_amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'bonus'))
);

-- Create loyalty redemptions table
CREATE TABLE public.loyalty_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_redemption_status CHECK (status IN ('pending', 'used', 'expired', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_tiers
CREATE POLICY "Users can view their loyalty tiers" ON public.loyalty_tiers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their loyalty tiers" ON public.loyalty_tiers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their loyalty tiers" ON public.loyalty_tiers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their loyalty tiers" ON public.loyalty_tiers
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for loyalty_rewards
CREATE POLICY "Users can view their loyalty rewards" ON public.loyalty_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their loyalty rewards" ON public.loyalty_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their loyalty rewards" ON public.loyalty_rewards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their loyalty rewards" ON public.loyalty_rewards
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for customer_loyalty_points
CREATE POLICY "Users can view their customer loyalty points" ON public.customer_loyalty_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create customer loyalty points" ON public.customer_loyalty_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update customer loyalty points" ON public.customer_loyalty_points
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for loyalty_transactions
CREATE POLICY "Users can view their loyalty transactions" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create loyalty transactions" ON public.loyalty_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for loyalty_redemptions
CREATE POLICY "Users can view their loyalty redemptions" ON public.loyalty_redemptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create loyalty redemptions" ON public.loyalty_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their loyalty redemptions" ON public.loyalty_redemptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_customer_loyalty_points_customer ON public.customer_loyalty_points(customer_id);
CREATE INDEX idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_redemptions_customer ON public.loyalty_redemptions(customer_id);
CREATE INDEX idx_loyalty_redemptions_status ON public.loyalty_redemptions(status);

-- Add update trigger for loyalty tables
CREATE TRIGGER update_loyalty_tiers_updated_at
  BEFORE UPDATE ON public.loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_loyalty_points_updated_at
  BEFORE UPDATE ON public.customer_loyalty_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_redemptions_updated_at
  BEFORE UPDATE ON public.loyalty_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically update customer tier based on points
CREATE OR REPLACE FUNCTION public.update_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier_id UUID;
BEGIN
  -- Find the appropriate tier based on lifetime points
  SELECT id INTO new_tier_id
  FROM public.loyalty_tiers
  WHERE user_id = NEW.user_id
    AND NEW.lifetime_points >= min_points
    AND (max_points IS NULL OR NEW.lifetime_points < max_points)
  ORDER BY min_points DESC
  LIMIT 1;

  -- Update the customer's tier if changed
  IF new_tier_id IS DISTINCT FROM NEW.current_tier_id THEN
    NEW.current_tier_id := new_tier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_customer_tier_on_points_change
  BEFORE UPDATE OF lifetime_points ON public.customer_loyalty_points
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_tier();

-- Add comments for documentation
COMMENT ON TABLE public.loyalty_tiers IS 'Defines reward tiers based on points thresholds';
COMMENT ON TABLE public.loyalty_rewards IS 'Catalog of rewards customers can redeem with points';
COMMENT ON TABLE public.customer_loyalty_points IS 'Tracks each customer''s points balance and tier';
COMMENT ON TABLE public.loyalty_transactions IS 'History of all points earned and spent';
COMMENT ON TABLE public.loyalty_redemptions IS 'Tracks reward redemptions and their status';