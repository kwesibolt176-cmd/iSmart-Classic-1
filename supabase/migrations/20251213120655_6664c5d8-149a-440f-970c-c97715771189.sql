-- Add RLS policy for customer portal sessions (already exists from types)
-- Allow public SELECT on customer_portal_sessions for session validation
CREATE POLICY "Anyone can validate sessions"
ON public.customer_portal_sessions
FOR SELECT
USING (true);

-- Allow authenticated users to create sessions for their customers
CREATE POLICY "Business owners can create sessions"
ON public.customer_portal_sessions
FOR INSERT
WITH CHECK (auth.uid() = business_user_id);

-- Allow authenticated users to delete their sessions
CREATE POLICY "Business owners can delete sessions"
ON public.customer_portal_sessions
FOR DELETE
USING (auth.uid() = business_user_id);

-- Create RLS policies for public access to orders via customer portal
CREATE POLICY "Customer portal can view orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.customer_id = orders.customer_id
    AND cps.expires_at > now()
  )
);

-- Create RLS policies for public access to customer_loyalty_points via customer portal
CREATE POLICY "Customer portal can view loyalty points"
ON public.customer_loyalty_points
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.customer_id = customer_loyalty_points.customer_id
    AND cps.expires_at > now()
  )
);

-- Create RLS policies for public access to customers via customer portal
CREATE POLICY "Customer portal can view customer"
ON public.customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.customer_id = customers.id
    AND cps.expires_at > now()
  )
);

-- Allow customer portal to view loyalty tiers
CREATE POLICY "Customer portal can view tiers"
ON public.loyalty_tiers
FOR SELECT
USING (true);

-- Allow customer portal to view available rewards
CREATE POLICY "Customer portal can view rewards"
ON public.loyalty_rewards
FOR SELECT
USING (is_active = true);

-- Allow customer portal to create redemptions
CREATE POLICY "Customer portal can create redemptions"
ON public.loyalty_redemptions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.customer_id = loyalty_redemptions.customer_id
    AND cps.expires_at > now()
  )
);

-- Allow customer portal to update loyalty points
CREATE POLICY "Customer portal can update loyalty points"
ON public.customer_loyalty_points
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.customer_id = customer_loyalty_points.customer_id
    AND cps.expires_at > now()
  )
);

-- Allow customer portal to create loyalty transactions
CREATE POLICY "Customer portal can create loyalty transactions"
ON public.loyalty_transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_portal_sessions cps
    WHERE cps.customer_id = loyalty_transactions.customer_id
    AND cps.expires_at > now()
  )
);