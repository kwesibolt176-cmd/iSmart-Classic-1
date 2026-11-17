-- Create payment plans table
CREATE TABLE public.invoice_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  first_payment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create installments table
CREATE TABLE public.invoice_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES public.invoice_payment_plans(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  paid_amount NUMERIC DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_installments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment plans
CREATE POLICY "Users can view their payment plans"
  ON public.invoice_payment_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their payment plans"
  ON public.invoice_payment_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their payment plans"
  ON public.invoice_payment_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their payment plans"
  ON public.invoice_payment_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for installments
CREATE POLICY "Users can view their installments"
  ON public.invoice_installments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their installments"
  ON public.invoice_installments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their installments"
  ON public.invoice_installments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their installments"
  ON public.invoice_installments FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_payment_plans_invoice ON public.invoice_payment_plans(invoice_id);
CREATE INDEX idx_payment_plans_user ON public.invoice_payment_plans(user_id);
CREATE INDEX idx_installments_payment_plan ON public.invoice_installments(payment_plan_id);
CREATE INDEX idx_installments_invoice ON public.invoice_installments(invoice_id);
CREATE INDEX idx_installments_user ON public.invoice_installments(user_id);
CREATE INDEX idx_installments_status ON public.invoice_installments(status);
CREATE INDEX idx_installments_due_date ON public.invoice_installments(due_date);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.invoice_payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_installments_updated_at
  BEFORE UPDATE ON public.invoice_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();