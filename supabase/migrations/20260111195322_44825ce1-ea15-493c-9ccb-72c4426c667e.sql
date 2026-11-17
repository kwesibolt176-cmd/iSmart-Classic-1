-- Customer Referral Program
CREATE TABLE public.referral_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Referral Program',
  is_active BOOLEAN DEFAULT true,
  referrer_reward_type TEXT DEFAULT 'points', -- 'points', 'discount_percent', 'discount_fixed'
  referrer_reward_value NUMERIC DEFAULT 100,
  referee_reward_type TEXT DEFAULT 'discount_percent',
  referee_reward_value NUMERIC DEFAULT 10,
  min_purchase_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referrer_id UUID NOT NULL REFERENCES public.customers(id),
  referee_id UUID NOT NULL REFERENCES public.customers(id),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id),
  order_id UUID REFERENCES public.orders(id),
  referrer_reward_given BOOLEAN DEFAULT false,
  referee_reward_given BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'expired'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Product Reviews
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- A/B Testing for Campaigns
CREATE TABLE public.campaign_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- 'email', 'sms'
  status TEXT DEFAULT 'draft', -- 'draft', 'running', 'completed', 'cancelled'
  variant_a_subject TEXT,
  variant_a_content TEXT NOT NULL,
  variant_b_subject TEXT,
  variant_b_content TEXT NOT NULL,
  split_percentage INTEGER DEFAULT 50, -- percentage for variant A
  winner_criteria TEXT DEFAULT 'open_rate', -- 'open_rate', 'click_rate', 'conversion'
  winner_variant TEXT, -- 'A', 'B', null
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_ab_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ab_test_id UUID NOT NULL REFERENCES public.campaign_ab_tests(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  recipient TEXT NOT NULL,
  variant TEXT NOT NULL, -- 'A' or 'B'
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ab_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_programs
CREATE POLICY "Users can manage their referral programs" ON public.referral_programs
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for referral_codes
CREATE POLICY "Users can manage their referral codes" ON public.referral_codes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view active referral codes" ON public.referral_codes
  FOR SELECT USING (is_active = true);

-- RLS Policies for referrals
CREATE POLICY "Users can manage their referrals" ON public.referrals
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for product_reviews
CREATE POLICY "Users can manage their product reviews" ON public.product_reviews
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view approved reviews" ON public.product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Public can submit reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (true);

-- RLS Policies for campaign_ab_tests
CREATE POLICY "Users can manage their AB tests" ON public.campaign_ab_tests
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for campaign_ab_recipients
CREATE POLICY "Users can manage their AB recipients" ON public.campaign_ab_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaign_ab_tests t 
      WHERE t.id = ab_test_id AND t.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_product_reviews_item ON public.product_reviews(inventory_item_id);
CREATE INDEX idx_product_reviews_approved ON public.product_reviews(is_approved) WHERE is_approved = true;
CREATE INDEX idx_ab_recipients_test ON public.campaign_ab_recipients(ab_test_id);

-- Triggers for updated_at
CREATE TRIGGER update_referral_programs_updated_at
  BEFORE UPDATE ON public.referral_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_ab_tests_updated_at
  BEFORE UPDATE ON public.campaign_ab_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();