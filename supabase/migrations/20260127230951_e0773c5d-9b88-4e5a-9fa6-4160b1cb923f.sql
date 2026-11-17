-- Fix split_payment_recipients policies - add INSERT, UPDATE, DELETE
CREATE POLICY "Business owners can insert split recipients"
  ON public.split_payment_recipients FOR INSERT
  WITH CHECK (split_rule_id IN (
    SELECT id FROM public.split_payment_rules
    WHERE business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Business owners can update split recipients"
  ON public.split_payment_recipients FOR UPDATE
  USING (split_rule_id IN (
    SELECT id FROM public.split_payment_rules
    WHERE business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Business owners can delete split recipients"
  ON public.split_payment_recipients FOR DELETE
  USING (split_rule_id IN (
    SELECT id FROM public.split_payment_rules
    WHERE business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid())
  ));