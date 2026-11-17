-- 1. Lock the one-time verification code table down to server-side use only
REVOKE ALL ON public.verification_otps FROM anon, authenticated;
GRANT ALL ON public.verification_otps TO service_role;
CREATE POLICY "No client access to verification codes"
ON public.verification_otps FOR ALL TO authenticated
USING (false) WITH CHECK (false);

-- 2. Make the trial usage view respect the querying user's permissions
ALTER VIEW public.trial_usage_summary SET (security_invoker = true);

-- 3. Pin search_path on the remaining mutable function
CREATE OR REPLACE FUNCTION public.generate_short_code(length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$function$;

-- 4. Remove public/anonymous execute rights from internal SECURITY DEFINER routines
REVOKE EXECUTE ON FUNCTION public.auto_create_business_wallet() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calculate_days_to_payment() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_verification_level() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deduct_ingredients_on_order_completion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deduct_inventory_on_order_completion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_single_default_location() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_inventory_slug() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_inventory_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_variant_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_customer_tier() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_gift_card_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_payment_link_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_transaction_reference(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_trial_service_usage(uuid, text, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_gift_card_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_link_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_transaction_reference(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_trial_service_usage(uuid, text, integer) TO authenticated;