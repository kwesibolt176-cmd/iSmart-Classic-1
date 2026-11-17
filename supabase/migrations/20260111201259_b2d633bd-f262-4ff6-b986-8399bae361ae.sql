-- SLA Configuration for support tickets
CREATE TABLE public.sla_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  priority VARCHAR(20) NOT NULL UNIQUE,
  first_response_hours INT NOT NULL,
  resolution_hours INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add only missing SLA tracking columns to support_tickets (priority already exists)
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_status VARCHAR(20) DEFAULT 'on_track',
ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMP WITH TIME ZONE;

-- Staff commissions table
CREATE TABLE public.staff_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  order_total NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Staff tips table  
CREATE TABLE public.staff_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  tip_amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Commission rules table
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  applies_to_staff_ids UUID[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

-- SLA Configurations policies (super admins only)
CREATE POLICY "Super admins can manage SLA configurations"
ON public.sla_configurations FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Staff commissions policies
CREATE POLICY "Users can view their staff commissions"
ON public.staff_commissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create staff commissions"
ON public.staff_commissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their staff commissions"
ON public.staff_commissions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their staff commissions"
ON public.staff_commissions FOR DELETE
USING (auth.uid() = user_id);

-- Staff tips policies
CREATE POLICY "Users can view their staff tips"
ON public.staff_tips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create staff tips"
ON public.staff_tips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their staff tips"
ON public.staff_tips FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their staff tips"
ON public.staff_tips FOR DELETE
USING (auth.uid() = user_id);

-- Commission rules policies
CREATE POLICY "Users can view their commission rules"
ON public.commission_rules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create commission rules"
ON public.commission_rules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their commission rules"
ON public.commission_rules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their commission rules"
ON public.commission_rules FOR DELETE
USING (auth.uid() = user_id);

-- Insert default SLA configurations
INSERT INTO public.sla_configurations (priority, first_response_hours, resolution_hours) VALUES
('urgent', 1, 4),
('high', 4, 24),
('normal', 8, 48),
('low', 24, 72);

-- Add updated_at triggers
CREATE TRIGGER update_sla_configurations_updated_at
BEFORE UPDATE ON public.sla_configurations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_commissions_updated_at
BEFORE UPDATE ON public.staff_commissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_tips_updated_at
BEFORE UPDATE ON public.staff_tips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_rules_updated_at
BEFORE UPDATE ON public.commission_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();