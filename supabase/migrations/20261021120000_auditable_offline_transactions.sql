CREATE TABLE IF NOT EXISTS public.offline_transaction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  client_created_at timestamptz NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  payload_hash text NOT NULL
);

ALTER TABLE public.offline_transaction_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.offline_transaction_audit FROM anon, authenticated;

CREATE POLICY "Users can read their offline transaction audit"
ON public.offline_transaction_audit FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_offline_transaction(
  _id uuid,
  _transaction_number text,
  _amount numeric,
  _payment_method text,
  _order_id uuid,
  _location_id uuid,
  _client_created_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  caller uuid := auth.uid();
  audit_payload jsonb;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _amount <= 0 OR _amount > 100000000 THEN RAISE EXCEPTION 'invalid transaction amount'; END IF;
  IF length(trim(_transaction_number)) < 1 OR length(_transaction_number) > 100 THEN RAISE EXCEPTION 'invalid transaction number'; END IF;
  IF _client_created_at > now() + interval '5 minutes' OR _client_created_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'invalid offline transaction timestamp';
  END IF;
  IF _location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = _location_id AND user_id = caller
  ) THEN RAISE EXCEPTION 'location access denied'; END IF;
  IF _order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = caller
  ) THEN RAISE EXCEPTION 'order access denied'; END IF;

  audit_payload := jsonb_build_object(
    'id', _id, 'transaction_number', _transaction_number, 'amount', _amount,
    'payment_method', _payment_method, 'order_id', _order_id,
    'location_id', _location_id, 'client_created_at', _client_created_at
  );

  INSERT INTO public.transactions (
    id, user_id, transaction_number, amount, payment_method, order_id,
    location_id, status, transaction_date, created_at
  ) VALUES (
    _id, caller, _transaction_number, _amount, _payment_method, _order_id,
    _location_id, 'completed', _client_created_at, now()
  ) ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = _id AND user_id = caller AND transaction_number = _transaction_number
      AND amount = _amount
  ) THEN RAISE EXCEPTION 'transaction id conflict'; END IF;

  INSERT INTO public.offline_transaction_audit (
    transaction_id, user_id, client_created_at, payload, payload_hash
  ) VALUES (
    _id, caller, _client_created_at, audit_payload,
    encode(digest(audit_payload::text, 'sha256'), 'hex')
  ) ON CONFLICT (transaction_id) DO NOTHING;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_offline_transaction(uuid,text,numeric,text,uuid,uuid,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_offline_transaction(uuid,text,numeric,text,uuid,uuid,timestamptz) TO authenticated;
