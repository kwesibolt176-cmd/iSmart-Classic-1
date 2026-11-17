-- POS transactions belong to the merchant, not whichever staff member operated the till.
UPDATE public.transactions AS tx
SET user_id = staff.user_id
FROM public.staff AS staff
WHERE tx.staff_id = staff.id
  AND tx.user_id IS DISTINCT FROM staff.user_id;

DROP POLICY IF EXISTS "Users can view their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions" ON public.transactions;

CREATE POLICY "Merchant members can view transactions" ON public.transactions FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.staff_business_assignments assignment
  WHERE assignment.staff_auth_user_id = auth.uid() AND assignment.business_user_id = transactions.user_id AND assignment.status = 'active'
));

CREATE POLICY "Merchant members can create transactions" ON public.transactions FOR INSERT
WITH CHECK (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.staff_business_assignments assignment
  WHERE assignment.staff_auth_user_id = auth.uid() AND assignment.business_user_id = transactions.user_id AND assignment.status = 'active'
));

CREATE POLICY "Merchant members can update transactions" ON public.transactions FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.staff_business_assignments assignment
  WHERE assignment.staff_auth_user_id = auth.uid() AND assignment.business_user_id = transactions.user_id AND assignment.status = 'active'
))
WITH CHECK (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.staff_business_assignments assignment
  WHERE assignment.staff_auth_user_id = auth.uid() AND assignment.business_user_id = transactions.user_id AND assignment.status = 'active'
));
