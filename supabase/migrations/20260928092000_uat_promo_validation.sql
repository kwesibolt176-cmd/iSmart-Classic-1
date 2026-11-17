-- Validate entered promotion codes without exposing codes that are intentionally
-- hidden from the storefront banner. The caller must know both tenant and code.
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_user_id uuid,
  p_code text,
  p_order_amount numeric DEFAULT 0
)
RETURNS TABLE (
  promo_id uuid,
  discount_type text,
  discount_value numeric,
  message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.discount_type::text, p.discount_value, p.message
  FROM public.promo_codes p
  WHERE p.user_id = p_user_id
    AND upper(btrim(p.code)) = upper(btrim(p_code))
    AND p.is_active
    AND (p.starts_at IS NULL OR p.starts_at <= now())
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND (p.max_uses IS NULL OR coalesce(p.current_uses, 0) < p.max_uses)
    AND (p.min_order_amount IS NULL OR p_order_amount >= p.min_order_amount)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_promo_code(uuid, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(uuid, text, numeric) TO anon, authenticated;
