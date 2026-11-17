GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() = recipient_id);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;