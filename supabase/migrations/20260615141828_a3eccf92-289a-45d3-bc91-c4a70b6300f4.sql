ALTER TABLE public.subscription_plans RENAME COLUMN paystack_plan_code TO external_plan_code;

ALTER TABLE public.user_subscriptions DROP COLUMN IF EXISTS paystack_subscription_code;
ALTER TABLE public.user_subscriptions DROP COLUMN IF EXISTS paystack_customer_code;
ALTER TABLE public.user_subscriptions DROP COLUMN IF EXISTS paystack_authorization_code;
ALTER TABLE public.user_subscriptions DROP COLUMN IF EXISTS paystack_email_token;

ALTER TABLE public.credit_transactions RENAME COLUMN paystack_reference TO payment_reference;

ALTER TABLE public.payment_transactions RENAME COLUMN paystack_reference TO payment_reference;
ALTER TABLE public.payment_transactions RENAME COLUMN paystack_transaction_id TO external_transaction_id;
ALTER TABLE public.payment_transactions DROP COLUMN IF EXISTS paystack_authorization_url;
ALTER TABLE public.payment_transactions DROP COLUMN IF EXISTS paystack_access_code;