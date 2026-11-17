-- Transaction-safe gift card issuance and redemption.

ALTER TABLE public.gift_cards
  ADD CONSTRAINT gift_cards_nonnegative_balances
  CHECK (initial_balance > 0 AND current_balance >= 0 AND current_balance <= initial_balance)
  NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS gift_card_redemption_order_once
ON public.gift_card_transactions (gift_card_id, order_id)
WHERE order_id IS NOT NULL AND transaction_type = 'debit';

CREATE OR REPLACE FUNCTION public.issue_gift_card(
  p_amount numeric,
  p_recipient_name text DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL,
  p_require_otp boolean DEFAULT false,
  p_expiry_date timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.gift_cards
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_card public.gift_cards;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Gift card amount must be greater than zero' USING ERRCODE = '23514'; END IF;
  IF p_expiry_date IS NOT NULL AND p_expiry_date <= now() THEN RAISE EXCEPTION 'Expiry date must be in the future' USING ERRCODE = '23514'; END IF;

  INSERT INTO public.gift_cards (
    user_id, code, initial_balance, current_balance, issued_to_name,
    issued_to_email, issued_to_phone, require_otp, expiry_date, notes
  ) VALUES (
    v_user_id, public.generate_gift_card_code(), p_amount, p_amount,
    nullif(btrim(p_recipient_name), ''), nullif(btrim(p_recipient_email), ''),
    nullif(btrim(p_recipient_phone), ''), p_require_otp, p_expiry_date, nullif(btrim(p_notes), '')
  ) RETURNING * INTO v_card;

  INSERT INTO public.gift_card_transactions (
    gift_card_id, user_id, transaction_type, amount, balance_before, balance_after, notes
  ) VALUES (v_card.id, v_user_id, 'credit', p_amount, 0, p_amount, 'Gift card issued');

  RETURN v_card;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_gift_card(
  p_gift_card_id uuid,
  p_amount numeric,
  p_order_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.gift_cards
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_card public.gift_cards;
  v_existing public.gift_card_transactions;
  v_new_balance numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Redemption amount must be greater than zero' USING ERRCODE = '23514'; END IF;
  IF p_order_id IS NULL THEN RAISE EXCEPTION 'Order is required for idempotent redemption' USING ERRCODE = '23502'; END IF;

  SELECT * INTO v_existing
  FROM public.gift_card_transactions
  WHERE gift_card_id = p_gift_card_id AND order_id = p_order_id AND transaction_type = 'debit';

  IF FOUND THEN
    SELECT * INTO v_card FROM public.gift_cards WHERE id = p_gift_card_id;
    RETURN v_card;
  END IF;

  SELECT * INTO v_card
  FROM public.gift_cards
  WHERE id = p_gift_card_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Gift card not found for this business' USING ERRCODE = 'P0002'; END IF;
  IF v_card.expiry_date IS NOT NULL AND v_card.expiry_date <= now() THEN
    UPDATE public.gift_cards SET status = 'expired' WHERE id = v_card.id;
    RAISE EXCEPTION 'Gift card has expired' USING ERRCODE = '23514';
  END IF;
  IF v_card.status <> 'active' THEN RAISE EXCEPTION 'Gift card is not active' USING ERRCODE = '23514'; END IF;
  IF v_card.current_balance < p_amount THEN RAISE EXCEPTION 'Insufficient gift card balance' USING ERRCODE = '23514'; END IF;

  v_new_balance := v_card.current_balance - p_amount;
  UPDATE public.gift_cards
  SET current_balance = v_new_balance,
      status = CASE WHEN v_new_balance = 0 THEN 'used' ELSE 'active' END,
      otp_verified = false
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  INSERT INTO public.gift_card_transactions (
    gift_card_id, user_id, transaction_type, amount, balance_before, balance_after, order_id, notes
  ) VALUES (
    v_card.id, v_user_id, 'debit', p_amount, v_card.current_balance + p_amount,
    v_card.current_balance, p_order_id, nullif(btrim(p_notes), '')
  );

  RETURN v_card;
END;
$$;
