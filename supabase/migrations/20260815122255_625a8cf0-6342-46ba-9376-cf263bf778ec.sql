CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

CREATE POLICY "Users can replace their own KYC documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can remove their own KYC documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their verification" ON public.business_verifications;

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
  AND verification_level = 0
  AND status IN ('pending', 'in_progress')
  AND COALESCE(email_verified, false) = false
  AND COALESCE(phone_verified, false) = false
  AND COALESCE(certificate_of_incorporation_verified, false) = false
  AND COALESCE(ghana_card_front_verified, false) = false
  AND COALESCE(ghana_card_back_verified, false) = false
  AND COALESCE(business_registration_verified, false) = false
  AND COALESCE(business_license_verified, false) = false
  AND COALESCE(operating_permit_verified, false) = false
  AND COALESCE(proof_of_address_verified, false) = false
  AND COALESCE(identity_verified, false) = false
  AND COALESCE(address_verified, false) = false
  AND COALESCE(bank_verified, false) = false
  AND verified_at IS NULL
);