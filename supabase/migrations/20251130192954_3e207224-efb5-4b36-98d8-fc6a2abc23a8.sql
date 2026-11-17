-- Create gift cards table
CREATE TABLE public.gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  initial_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  issued_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  issued_to_name TEXT,
  issued_to_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gift card transactions table
CREATE TABLE public.gift_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- Gift cards policies
CREATE POLICY "Users can create gift cards"
  ON public.gift_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their gift cards"
  ON public.gift_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their gift cards"
  ON public.gift_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their gift cards"
  ON public.gift_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Gift card transactions policies
CREATE POLICY "Users can create gift card transactions"
  ON public.gift_card_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their gift card transactions"
  ON public.gift_card_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_gift_cards_user_id ON public.gift_cards(user_id);
CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX idx_gift_cards_status ON public.gift_cards(status);
CREATE INDEX idx_gift_card_transactions_gift_card_id ON public.gift_card_transactions(gift_card_id);
CREATE INDEX idx_gift_card_transactions_user_id ON public.gift_card_transactions(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_gift_cards_updated_at
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique gift card code
CREATE OR REPLACE FUNCTION public.generate_gift_card_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 16-character alphanumeric code in format XXXX-XXXX-XXXX-XXXX
    new_code := 
      SUBSTRING(MD5(random()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 4) || '-' ||
      SUBSTRING(MD5(random()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 4) || '-' ||
      SUBSTRING(MD5(random()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 4) || '-' ||
      SUBSTRING(MD5(random()::TEXT || clock_timestamp()::TEXT) FROM 1 FOR 4);
    
    new_code := UPPER(new_code);
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.gift_cards WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;