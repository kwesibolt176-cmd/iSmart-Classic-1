-- Create staff_roles table for custom business roles
CREATE TABLE public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{"products": true, "orders": true, "customers": true, "kitchen": true, "tables": true, "reservations": true, "settings": false, "reports": false, "staff_management": false}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add auth_user_id to staff table for linking to auth.users
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.staff_roles(id);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on staff_roles
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_roles
CREATE POLICY "Business owners can manage their roles"
ON public.staff_roles
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view roles for their business"
ON public.staff_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.auth_user_id = auth.uid()
    AND s.user_id = staff_roles.user_id
  )
);

-- Update staff policies to allow staff to view their own record
CREATE POLICY "Staff can view their own staff record"
ON public.staff
FOR SELECT
USING (auth_user_id = auth.uid());

-- Create function to check if a staff member has a specific permission
CREATE OR REPLACE FUNCTION public.staff_has_permission(_auth_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    LEFT JOIN public.staff_roles sr ON s.role_id = sr.id
    WHERE s.auth_user_id = _auth_user_id
    AND s.is_active = true
    AND (sr.permissions->_permission)::boolean = true
  )
$$;

-- Create function to check if user is business owner
CREATE OR REPLACE FUNCTION public.is_business_owner(_auth_user_id uuid, _business_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _auth_user_id = _business_user_id
$$;

-- Create default roles for businesses
INSERT INTO public.staff_roles (user_id, name, description, permissions)
SELECT DISTINCT user_id, 'Manager', 'Full access except settings', 
  '{"products": true, "orders": true, "customers": true, "kitchen": true, "tables": true, "reservations": true, "settings": false, "reports": true, "staff_management": false}'::jsonb
FROM public.staff WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_roles (user_id, name, description, permissions)
SELECT DISTINCT user_id, 'Cashier', 'POS and orders only',
  '{"products": true, "orders": true, "customers": true, "kitchen": false, "tables": false, "reservations": false, "settings": false, "reports": false, "staff_management": false}'::jsonb
FROM public.staff WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_roles (user_id, name, description, permissions)
SELECT DISTINCT user_id, 'Server', 'Orders and tables',
  '{"products": true, "orders": true, "customers": false, "kitchen": true, "tables": true, "reservations": true, "settings": false, "reports": false, "staff_management": false}'::jsonb
FROM public.staff WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;