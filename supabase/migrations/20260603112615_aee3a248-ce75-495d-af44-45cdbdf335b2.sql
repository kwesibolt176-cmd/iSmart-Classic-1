
CREATE TABLE public.verification_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('email','phone')),
  destination text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_otps_lookup ON public.verification_otps(user_id, purpose, consumed_at);

GRANT ALL ON public.verification_otps TO service_role;

ALTER TABLE public.verification_otps ENABLE ROW LEVEL SECURITY;
