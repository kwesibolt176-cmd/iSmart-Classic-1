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
  AND verification_level IS NOT DISTINCT FROM (SELECT bv.verification_level FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND email_verified IS NOT DISTINCT FROM (SELECT bv.email_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND phone_verified IS NOT DISTINCT FROM (SELECT bv.phone_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND certificate_of_incorporation_verified IS NOT DISTINCT FROM (SELECT bv.certificate_of_incorporation_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND ghana_card_front_verified IS NOT DISTINCT FROM (SELECT bv.ghana_card_front_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND ghana_card_back_verified IS NOT DISTINCT FROM (SELECT bv.ghana_card_back_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND business_registration_verified IS NOT DISTINCT FROM (SELECT bv.business_registration_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND business_license_verified IS NOT DISTINCT FROM (SELECT bv.business_license_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND operating_permit_verified IS NOT DISTINCT FROM (SELECT bv.operating_permit_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND proof_of_address_verified IS NOT DISTINCT FROM (SELECT bv.proof_of_address_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND identity_verified IS NOT DISTINCT FROM (SELECT bv.identity_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND address_verified IS NOT DISTINCT FROM (SELECT bv.address_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND bank_verified IS NOT DISTINCT FROM (SELECT bv.bank_verified FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND verified_at IS NOT DISTINCT FROM (SELECT bv.verified_at FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
  AND verified_by IS NOT DISTINCT FROM (SELECT bv.verified_by FROM public.business_verifications bv WHERE bv.id = business_verifications.id)
);