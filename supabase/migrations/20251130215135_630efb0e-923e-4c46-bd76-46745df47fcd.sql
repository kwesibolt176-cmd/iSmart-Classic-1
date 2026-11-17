-- Create RLS policies for super_admin to access all data across all businesses

-- Super admins can view all business profiles
CREATE POLICY "Super admins can view all business profiles"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all orders
CREATE POLICY "Super admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all transactions
CREATE POLICY "Super admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all invoices
CREATE POLICY "Super admins can view all invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can manage all pending actions (already has policies, adding additional)
CREATE POLICY "Super admins can execute pending actions"
ON public.pending_actions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete pending actions"
ON public.pending_actions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all customers
CREATE POLICY "Super admins can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all inventory
CREATE POLICY "Super admins can view all inventory"
ON public.inventory_items
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view and manage all subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all campaigns
CREATE POLICY "Super admins can view all email campaigns"
ON public.email_campaigns
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all SMS campaigns"
ON public.sms_campaigns
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all staff
CREATE POLICY "Super admins can view all staff"
ON public.staff
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all locations
CREATE POLICY "Super admins can view all locations"
ON public.locations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));