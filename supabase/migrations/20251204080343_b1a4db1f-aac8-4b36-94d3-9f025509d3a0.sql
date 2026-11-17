-- Deactivate duplicate plans, keeping only Starter, Professional, Enterprise
UPDATE subscription_plans SET is_active = false WHERE id IN (
  'febc4f6d-3edf-471c-a0d2-7ce7e3747360', -- Free
  'd866c868-fc6c-48ab-b5a5-9b14407df833', -- Basic
  '788e94d2-e08b-4723-b860-7d5a7d15b872', -- Pro
  '990005ad-ca4e-47b6-a855-907002d9a382'  -- Enterprise (duplicate)
);

-- Update display order for remaining 3 plans
UPDATE subscription_plans SET display_order = 1 WHERE id = 'd40bf31d-cd71-4174-b0c8-6c95b13fbaeb'; -- Starter
UPDATE subscription_plans SET display_order = 2 WHERE id = '40a1465c-63ae-455b-8f01-45da974677a0'; -- Professional
UPDATE subscription_plans SET display_order = 3 WHERE id = '3d2b4136-56f6-4091-ba68-72eb74ed6b31'; -- Enterprise

-- Create fraud_alerts table for tracking suspicious activities
CREATE TABLE public.fraud_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL, -- 'suspicious_transaction', 'unusual_login', 'multiple_refunds', 'high_value_order', 'velocity_check', 'location_mismatch'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'false_positive'
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC,
  ip_address TEXT,
  device_info TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all fraud alerts
CREATE POLICY "Super admins can manage fraud alerts"
  ON public.fraud_alerts
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Users can view fraud alerts for their business
CREATE POLICY "Users can view their fraud alerts"
  ON public.fraud_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create fraud_rules table for configurable fraud detection rules
CREATE TABLE public.fraud_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'velocity', 'amount_threshold', 'refund_ratio', 'location'
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage fraud rules
CREATE POLICY "Super admins can manage fraud rules"
  ON public.fraud_rules
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Insert default fraud rules
INSERT INTO public.fraud_rules (rule_name, rule_type, description, parameters, severity) VALUES
  ('High Value Transaction', 'amount_threshold', 'Flag transactions above threshold', '{"threshold": 5000}', 'high'),
  ('Multiple Refunds', 'refund_ratio', 'Flag accounts with high refund rates', '{"threshold_percentage": 20, "min_transactions": 5}', 'medium'),
  ('Velocity Check', 'velocity', 'Flag rapid successive transactions', '{"max_transactions": 10, "time_window_minutes": 5}', 'high'),
  ('Unusual Hours', 'time_based', 'Flag transactions outside business hours', '{"start_hour": 6, "end_hour": 22}', 'low');

-- Create branch_inventory_assignments for admin-controlled inventory per location
CREATE TABLE public.branch_inventory_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  assigned_quantity INTEGER NOT NULL DEFAULT 0,
  assigned_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(inventory_item_id, location_id)
);

-- Enable RLS
ALTER TABLE public.branch_inventory_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage branch assignments
CREATE POLICY "Admins can manage branch assignments"
  ON public.branch_inventory_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Users can view assignments for their locations
CREATE POLICY "Users can view branch assignments"
  ON public.branch_inventory_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = branch_inventory_assignments.location_id
      AND l.user_id = auth.uid()
    )
  );