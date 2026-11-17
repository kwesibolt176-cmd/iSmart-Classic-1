-- Webhooks table for event notifications
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook delivery logs
CREATE TABLE public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Recurring payment schedules
CREATE TABLE public.recurring_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  frequency TEXT NOT NULL, -- daily, weekly, monthly, yearly
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  customer_phone TEXT,
  customer_email TEXT,
  payment_link_id UUID REFERENCES public.payment_links(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_collected NUMERIC NOT NULL DEFAULT 0,
  successful_runs INTEGER NOT NULL DEFAULT 0,
  failed_runs INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring payment execution history
CREATE TABLE public.recurring_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.recurring_schedules(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_endpoints
CREATE POLICY "Business owners can manage their webhooks"
ON public.webhook_endpoints FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = business_id AND bp.user_id = auth.uid()
  )
);

-- RLS Policies for webhook_deliveries
CREATE POLICY "Business owners can view their webhook deliveries"
ON public.webhook_deliveries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.webhook_endpoints we
    JOIN public.business_profiles bp ON bp.id = we.business_id
    WHERE we.id = webhook_id AND bp.user_id = auth.uid()
  )
);

-- RLS Policies for recurring_schedules
CREATE POLICY "Business owners can manage their recurring schedules"
ON public.recurring_schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = business_id AND bp.user_id = auth.uid()
  )
);

-- RLS Policies for recurring_executions
CREATE POLICY "Business owners can view their recurring executions"
ON public.recurring_executions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recurring_schedules rs
    JOIN public.business_profiles bp ON bp.id = rs.business_id
    WHERE rs.id = schedule_id AND bp.user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_webhook_endpoints_business ON public.webhook_endpoints(business_id);
CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX idx_recurring_schedules_business ON public.recurring_schedules(business_id);
CREATE INDEX idx_recurring_schedules_next_run ON public.recurring_schedules(next_run_date) WHERE is_active = true;
CREATE INDEX idx_recurring_executions_schedule ON public.recurring_executions(schedule_id);

-- Update triggers
CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_schedules_updated_at
  BEFORE UPDATE ON public.recurring_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();