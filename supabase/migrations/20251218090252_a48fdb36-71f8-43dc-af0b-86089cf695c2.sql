-- Drop the prevent deletion policy
DROP POLICY IF EXISTS "Prevent deletion of business profiles" ON public.business_profiles;

-- Create policy allowing super admins to delete
CREATE POLICY "Super admins can delete business profiles"
ON public.business_profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create policy allowing super admins to update
DROP POLICY IF EXISTS "Super admins can update all business profiles" ON public.business_profiles;
CREATE POLICY "Super admins can update business profiles"
ON public.business_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR auth.uid() = user_id)
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR auth.uid() = user_id);