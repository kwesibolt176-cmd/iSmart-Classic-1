CREATE TABLE public.platform_secrets (
  secret_name text PRIMARY KEY,
  ciphertext text NOT NULL,
  initialization_vector text NOT NULL,
  key_version integer NOT NULL DEFAULT 1 CHECK (key_version = 1),
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_secrets ENABLE ROW LEVEL SECURITY;

-- Deliberately no RLS policies. Only the service-role client used by audited
-- Edge Functions may access encrypted platform secrets.
REVOKE ALL ON public.platform_secrets FROM anon, authenticated;

