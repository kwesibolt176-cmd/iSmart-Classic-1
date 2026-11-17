-- Create campaign automation rules table
CREATE TABLE public.campaign_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL CHECK (action_type IN ('email', 'sms')),
  template_id UUID REFERENCES public.communication_templates(id) ON DELETE SET NULL,
  custom_message TEXT,
  custom_subject TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment escalation settings table
CREATE TABLE public.payment_escalation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  escalation_levels JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_escalation_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaign_automation_rules
CREATE POLICY "Users can view their own automation rules" 
ON public.campaign_automation_rules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automation rules" 
ON public.campaign_automation_rules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules" 
ON public.campaign_automation_rules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules" 
ON public.campaign_automation_rules 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for payment_escalation_settings
CREATE POLICY "Users can view their own escalation settings" 
ON public.payment_escalation_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own escalation settings" 
ON public.payment_escalation_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own escalation settings" 
ON public.payment_escalation_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_campaign_automation_rules_updated_at
BEFORE UPDATE ON public.campaign_automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_escalation_settings_updated_at
BEFORE UPDATE ON public.payment_escalation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();