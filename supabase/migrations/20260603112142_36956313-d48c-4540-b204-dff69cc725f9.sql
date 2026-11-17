-- Add missing verification flag columns
ALTER TABLE public.business_verifications
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_of_incorporation_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ghana_card_front_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ghana_card_back_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_license_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operating_permit_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proof_of_address_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS certificate_of_incorporation_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS ghana_card_front_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS ghana_card_back_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_registration_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_license_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS operating_permit_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_of_address_verified_at timestamptz;

-- Auto-compute verification_level from completed requirements
CREATE OR REPLACE FUNCTION public.compute_verification_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lvl integer := 0;
  l1_ok boolean;
  l2_ok boolean;
  l3_ok boolean;
BEGIN
  l1_ok := COALESCE(NEW.email_verified, false) AND COALESCE(NEW.phone_verified, false);
  l2_ok := COALESCE(NEW.certificate_of_incorporation_verified, false)
       AND COALESCE(NEW.ghana_card_front_verified, false)
       AND COALESCE(NEW.ghana_card_back_verified, false)
       AND COALESCE(NEW.business_registration_verified, false);
  l3_ok := COALESCE(NEW.business_license_verified, false)
       AND COALESCE(NEW.operating_permit_verified, false)
       AND COALESCE(NEW.proof_of_address_verified, false);

  IF l1_ok THEN lvl := 1; END IF;
  IF l1_ok AND l2_ok THEN lvl := 2; END IF;
  IF l1_ok AND l2_ok AND l3_ok THEN lvl := 3; END IF;

  NEW.verification_level := lvl;

  IF lvl = 3 AND NEW.verified_at IS NULL THEN
    NEW.verified_at := now();
    NEW.status := 'verified';
  ELSIF lvl > 0 AND NEW.status IS NULL THEN
    NEW.status := 'in_progress';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_verification_level ON public.business_verifications;
CREATE TRIGGER trg_compute_verification_level
  BEFORE INSERT OR UPDATE ON public.business_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_verification_level();

-- Backfill verification_level on existing rows
UPDATE public.business_verifications SET updated_at = now();