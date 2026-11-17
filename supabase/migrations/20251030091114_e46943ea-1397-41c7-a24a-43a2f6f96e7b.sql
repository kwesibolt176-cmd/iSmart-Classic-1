-- Create email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create SMS campaigns table
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campaign recipients table
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_campaigns
CREATE POLICY "Users can view their own email campaigns"
  ON public.email_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email campaigns"
  ON public.email_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email campaigns"
  ON public.email_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email campaigns"
  ON public.email_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sms_campaigns
CREATE POLICY "Users can view their own SMS campaigns"
  ON public.sms_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SMS campaigns"
  ON public.sms_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMS campaigns"
  ON public.sms_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMS campaigns"
  ON public.sms_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for campaign_recipients
CREATE POLICY "Users can view recipients for their campaigns"
  ON public.campaign_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns 
      WHERE id = campaign_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.sms_campaigns 
      WHERE id = campaign_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recipients for their campaigns"
  ON public.campaign_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_campaigns 
      WHERE id = campaign_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.sms_campaigns 
      WHERE id = campaign_id AND user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_campaigns_updated_at
  BEFORE UPDATE ON public.sms_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();