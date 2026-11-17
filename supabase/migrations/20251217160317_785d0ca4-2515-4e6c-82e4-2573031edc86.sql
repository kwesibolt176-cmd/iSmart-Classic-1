-- Add payment_link column to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_link_token text UNIQUE;