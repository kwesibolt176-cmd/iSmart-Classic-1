-- Add policy for super admins to view all refunds
CREATE POLICY "Super admins can view all refunds"
ON public.refunds
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Add policy for super admins to update refunds (approve/reject)
CREATE POLICY "Super admins can update refunds"
ON public.refunds
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));