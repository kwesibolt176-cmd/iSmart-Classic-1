-- Add 'subscription' as a valid transaction type
ALTER TABLE credit_transactions 
DROP CONSTRAINT credit_transactions_transaction_type_check;

ALTER TABLE credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'usage'::text, 'refund'::text, 'bonus'::text, 'subscription'::text]));

-- Provision credits for existing active subscriptions where user has a business profile
INSERT INTO business_credits (business_id, sms_credits, email_credits)
SELECT DISTINCT 
  bp.id,
  COALESCE(sp.sms_limit, 0),
  COALESCE(sp.email_limit, 0)
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN business_profiles bp ON bp.user_id = us.user_id
WHERE us.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM business_credits bc WHERE bc.business_id = bp.id)
ON CONFLICT (business_id) DO NOTHING;

-- Create transaction records for SMS credits
INSERT INTO credit_transactions (business_id, credit_type, transaction_type, amount, balance_after, description)
SELECT 
  bc.business_id,
  'sms',
  'subscription',
  bc.sms_credits,
  bc.sms_credits,
  'Subscription plan credits'
FROM business_credits bc
WHERE bc.sms_credits > 0
  AND NOT EXISTS (
    SELECT 1 FROM credit_transactions ct 
    WHERE ct.business_id = bc.business_id AND ct.credit_type = 'sms'
  );

-- Create transaction records for Email credits
INSERT INTO credit_transactions (business_id, credit_type, transaction_type, amount, balance_after, description)
SELECT 
  bc.business_id,
  'email',
  'subscription',
  bc.email_credits,
  bc.email_credits,
  'Subscription plan credits'
FROM business_credits bc
WHERE bc.email_credits > 0
  AND NOT EXISTS (
    SELECT 1 FROM credit_transactions ct 
    WHERE ct.business_id = bc.business_id AND ct.credit_type = 'email'
  );