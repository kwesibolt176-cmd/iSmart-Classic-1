-- Merchant API credentials are server-side integration state. Never expose this
-- table through the Data API or grant access to authenticated/anonymous users.
CREATE TABLE IF NOT EXISTS public.merchant_api_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_principal_id uuid NOT NULL,
  business_id uuid,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  access_expires_at timestamptz,
  merchant_session_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_api_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.merchant_api_sessions FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS merchant_api_sessions_business_id_idx
  ON public.merchant_api_sessions (business_id);

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS merchant_business_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS business_profiles_merchant_business_id_idx
  ON public.business_profiles (merchant_business_id)
  WHERE merchant_business_id IS NOT NULL;
