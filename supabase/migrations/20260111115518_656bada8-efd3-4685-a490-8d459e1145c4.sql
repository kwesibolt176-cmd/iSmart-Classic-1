-- Allow all authenticated users to read communication-related system settings
CREATE POLICY "Authenticated users can read communication settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
  setting_key IN (
    'communication_auto_execute',
    'email_channel',
    'sms_channel',
    'email_from_name',
    'email_from_address'
  )
);