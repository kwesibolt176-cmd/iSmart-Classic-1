
CREATE TABLE IF NOT EXISTS public.ismart_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ismart_callbacks_reference ON public.ismart_callbacks(reference);
CREATE INDEX IF NOT EXISTS idx_ismart_callbacks_created_at ON public.ismart_callbacks(created_at DESC);

ALTER TABLE public.ismart_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view ismart callbacks"
ON public.ismart_callbacks
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));
