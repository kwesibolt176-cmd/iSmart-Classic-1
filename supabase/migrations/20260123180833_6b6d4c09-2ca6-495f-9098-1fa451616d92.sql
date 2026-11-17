-- Add recipient phone and OTP fields to gift_cards table
ALTER TABLE public.gift_cards 
ADD COLUMN IF NOT EXISTS issued_to_phone TEXT,
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_otp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sent_via_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sent_via_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Create gift_card_otp_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.gift_card_otp_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attempt_code TEXT NOT NULL,
  is_successful BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gift_card_otp_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for otp attempts
CREATE POLICY "Users can view their gift card otp attempts"
ON public.gift_card_otp_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create otp attempts"
ON public.gift_card_otp_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gift_card_otp_attempts_gift_card_id ON public.gift_card_otp_attempts(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards(code);