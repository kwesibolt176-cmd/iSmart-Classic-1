-- Add attachments column to support_ticket_messages
ALTER TABLE public.support_ticket_messages 
ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for support attachments
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Super admins can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- Enable realtime for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;