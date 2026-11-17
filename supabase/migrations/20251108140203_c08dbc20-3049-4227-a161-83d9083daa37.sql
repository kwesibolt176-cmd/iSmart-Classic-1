-- Add payment tracking fields to invoices table
ALTER TABLE public.invoices
ADD COLUMN payment_method TEXT,
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN paid_amount NUMERIC DEFAULT 0;

-- Update status check constraint if it exists, or add one
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'partially_paid', 'cancelled'));