-- Drop and recreate chat_messages for proper 1:1 messaging
DROP TABLE IF EXISTS public.chat_messages;

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table for managing chat threads
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  participant_one UUID NOT NULL,
  participant_two UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, participant_one, participant_two)
);

-- Create staff announcements table for business-level announcements
CREATE TABLE public.staff_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipient_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can view their chat messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their sent messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Chat conversations policies
CREATE POLICY "Users can view their conversations"
ON public.chat_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update conversations"
ON public.chat_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Staff announcements policies
CREATE POLICY "Users can view announcements for their business"
ON public.staff_announcements FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM staff WHERE staff.user_id = staff_announcements.user_id AND staff.id IS NOT NULL
));

CREATE POLICY "Admins can create announcements"
ON public.staff_announcements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update announcements"
ON public.staff_announcements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete announcements"
ON public.staff_announcements FOR DELETE
USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;