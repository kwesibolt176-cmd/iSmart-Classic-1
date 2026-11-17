-- Create communication templates table
CREATE TABLE public.communication_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own templates"
  ON public.communication_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.communication_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.communication_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.communication_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_communication_templates_user_id ON public.communication_templates(user_id);
CREATE INDEX idx_communication_templates_type ON public.communication_templates(type);
CREATE INDEX idx_communication_templates_is_active ON public.communication_templates(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_communication_templates_updated_at
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();