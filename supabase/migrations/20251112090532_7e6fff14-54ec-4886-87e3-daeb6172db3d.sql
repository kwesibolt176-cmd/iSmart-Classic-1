-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features, sms_limit, email_limit, is_active, display_order)
VALUES 
  (
    'Starter',
    'Perfect for small businesses getting started',
    29.99,
    299.99,
    '["Up to 1,000 transactions/month", "Basic inventory management", "Email support", "1 user account", "Basic reports"]'::jsonb,
    100,
    500,
    true,
    1
  ),
  (
    'Professional',
    'Ideal for growing businesses',
    79.99,
    799.99,
    '["Up to 10,000 transactions/month", "Advanced inventory management", "Priority email & chat support", "Up to 5 user accounts", "Advanced reports & analytics", "SMS campaigns", "Email campaigns", "Multi-location support"]'::jsonb,
    1000,
    5000,
    true,
    2
  ),
  (
    'Enterprise',
    'For large businesses with advanced needs',
    199.99,
    1999.99,
    '["Unlimited transactions", "Full inventory & supply chain management", "24/7 phone support", "Unlimited user accounts", "Custom reports & dashboards", "Unlimited SMS & email campaigns", "API access", "Dedicated account manager", "Custom integrations", "Advanced security features"]'::jsonb,
    NULL,
    NULL,
    true,
    3
  )
ON CONFLICT DO NOTHING;