-- Add unique constraints for customer email and phone per business
-- Only enforce uniqueness when email/phone is not null

CREATE UNIQUE INDEX customers_user_id_email_unique 
ON public.customers (user_id, email) 
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX customers_user_id_phone_unique 
ON public.customers (user_id, phone) 
WHERE phone IS NOT NULL;