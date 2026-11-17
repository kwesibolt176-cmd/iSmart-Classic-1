-- Create enum for action types
CREATE TYPE public.action_type AS ENUM (
  'send_email',
  'send_sms',
  'send_invoice',
  'send_payment_receipt',
  'process_payment',
  'send_reservation_confirmation',
  'send_order_confirmation',
  'send_order_status_update'
);

-- Create pending actions table
CREATE TABLE public.pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  executed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

-- Users can create their own pending actions
CREATE POLICY "Users can create their own pending actions"
ON public.pending_actions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own pending actions
CREATE POLICY "Users can view their own pending actions"
ON public.pending_actions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all pending actions
CREATE POLICY "Admins can view all pending actions"
ON public.pending_actions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update pending actions
CREATE POLICY "Admins can update pending actions"
ON public.pending_actions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete pending actions
CREATE POLICY "Admins can delete pending actions"
ON public.pending_actions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_pending_actions_status ON public.pending_actions(status);
CREATE INDEX idx_pending_actions_user_id ON public.pending_actions(user_id);
CREATE INDEX idx_pending_actions_action_type ON public.pending_actions(action_type);
CREATE INDEX idx_pending_actions_created_at ON public.pending_actions(created_at DESC);