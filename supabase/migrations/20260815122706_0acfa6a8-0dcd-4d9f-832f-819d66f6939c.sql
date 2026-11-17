CREATE OR REPLACE FUNCTION public.protect_business_verification_decisions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    IF NEW.verification_level IS DISTINCT FROM OLD.verification_level
      OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
      OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
      OR NEW.certificate_of_incorporation_verified IS DISTINCT FROM OLD.certificate_of_incorporation_verified
      OR NEW.ghana_card_front_verified IS DISTINCT FROM OLD.ghana_card_front_verified
      OR NEW.ghana_card_back_verified IS DISTINCT FROM OLD.ghana_card_back_verified
      OR NEW.business_registration_verified IS DISTINCT FROM OLD.business_registration_verified
      OR NEW.business_license_verified IS DISTINCT FROM OLD.business_license_verified
      OR NEW.operating_permit_verified IS DISTINCT FROM OLD.operating_permit_verified
      OR NEW.proof_of_address_verified IS DISTINCT FROM OLD.proof_of_address_verified
      OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
      OR NEW.address_verified IS DISTINCT FROM OLD.address_verified
      OR NEW.bank_verified IS DISTINCT FROM OLD.bank_verified
      OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
      OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
    THEN
      RAISE EXCEPTION 'Verification decisions can only be changed by an authorized reviewer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_business_verification_decisions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_business_verification_decisions() TO service_role;

DROP TRIGGER IF EXISTS protect_business_verification_decisions_trigger ON public.business_verifications;
CREATE TRIGGER protect_business_verification_decisions_trigger
BEFORE UPDATE ON public.business_verifications
FOR EACH ROW EXECUTE FUNCTION public.protect_business_verification_decisions();

DROP POLICY IF EXISTS "Users can submit verification documents" ON public.business_verifications;
CREATE POLICY "Users can submit verification documents"
ON public.business_verifications
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT bp.id FROM public.business_profiles bp WHERE bp.user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT bp.id FROM public.business_profiles bp WHERE bp.user_id = auth.uid()
  )
);