
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_access_status_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_access_status_check
  CHECK (access_status = ANY (ARRAY['active','suspended','revoked','invited','pending']));
