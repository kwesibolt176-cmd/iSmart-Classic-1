
-- Fix overly permissive policies by restricting to authenticated users and service role

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert status history" ON public.delivery_status_history;
DROP POLICY IF EXISTS "System can insert delivery logs" ON public.delivery_activity_logs;

-- Create more restrictive policies
-- Status history can be inserted by the delivery order owner or via service role (edge functions)
CREATE POLICY "Owners can insert status history for their deliveries"
ON public.delivery_status_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.delivery_orders
    WHERE id = delivery_order_id AND user_id = auth.uid()
  )
);

-- Activity logs can only be inserted by super admins
CREATE POLICY "Super admins can insert delivery logs"
ON public.delivery_activity_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
