
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;

CREATE POLICY "Merchants can insert their staff" ON public.staff
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can update their staff" ON public.staff
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can delete their staff" ON public.staff
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
