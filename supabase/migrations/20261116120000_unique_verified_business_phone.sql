-- One phone number may verify only one business (QA BUG-11).
-- verified_phone holds the canonical 233XXXXXXXXX form of the number that was verified.
ALTER TABLE public.business_verifications
  ADD COLUMN IF NOT EXISTS verified_phone text;

-- Backfill from the business profile for rows that are already phone-verified.
-- Where several businesses already verified the same number, only the earliest keeps
-- verified_phone, so the unique index can be created without changing anyone's status.
WITH normalized AS (
  SELECT
    bv.id,
    '233' || right(regexp_replace(regexp_replace(regexp_replace(bp.business_phone, '\D', '', 'g'), '^(233)+', ''), '^0+', ''), 9) AS phone_key,
    length(right(regexp_replace(regexp_replace(regexp_replace(bp.business_phone, '\D', '', 'g'), '^(233)+', ''), '^0+', ''), 9)) AS subscriber_length,
    bv.phone_verified_at
  FROM public.business_verifications bv
  JOIN public.business_profiles bp ON bp.id = bv.business_id
  WHERE bv.phone_verified IS TRUE AND bv.verified_phone IS NULL AND bp.business_phone IS NOT NULL
),
ranked AS (
  SELECT id, phone_key,
    row_number() OVER (PARTITION BY phone_key ORDER BY phone_verified_at NULLS LAST, id) AS rn
  FROM normalized
  WHERE subscriber_length = 9
)
UPDATE public.business_verifications bv
SET verified_phone = ranked.phone_key
FROM ranked
WHERE bv.id = ranked.id AND ranked.rn = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.business_verifications other
    WHERE other.verified_phone = ranked.phone_key AND other.phone_verified IS TRUE
  );

CREATE UNIQUE INDEX IF NOT EXISTS business_verifications_verified_phone_key
  ON public.business_verifications (verified_phone)
  WHERE phone_verified IS TRUE AND verified_phone IS NOT NULL;
