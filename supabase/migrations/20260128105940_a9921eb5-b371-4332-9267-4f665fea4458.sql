-- Drop existing user_roles policies that only check for admin
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create new policies that allow both admin and super_admin
CREATE POLICY "Admins and super admins can view all roles"
ON public.user_roles
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and super admins can insert roles"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and super admins can update roles"
ON public.user_roles
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and super admins can delete roles"
ON public.user_roles
FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);