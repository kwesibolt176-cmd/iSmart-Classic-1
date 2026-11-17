-- Create support chat messages table for persisting admin-user conversations
CREATE TABLE public.support_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'user')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_chat_messages
CREATE POLICY "Super admins can manage all chat messages"
ON public.support_chat_messages FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view messages on their tickets"
ON public.support_chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets st 
  WHERE st.id = support_chat_messages.ticket_id 
  AND st.user_id = auth.uid()
));

CREATE POLICY "Users can send messages on their tickets"
ON public.support_chat_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets st 
  WHERE st.id = support_chat_messages.ticket_id 
  AND st.user_id = auth.uid()
) AND sender_type = 'user');

-- Create scheduled reports table
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  table_name TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  recipient_emails TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled_reports
CREATE POLICY "Super admins can manage scheduled reports"
ON public.scheduled_reports FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();