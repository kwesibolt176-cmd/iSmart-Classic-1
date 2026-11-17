-- Fix customer_portal_sessions RLS policies - restrict to proper authentication
DROP POLICY IF EXISTS "Anyone can validate sessions" ON public.customer_portal_sessions;
DROP POLICY IF EXISTS "Public can validate sessions" ON public.customer_portal_sessions;
DROP POLICY IF EXISTS "System can create sessions" ON public.customer_portal_sessions;
DROP POLICY IF EXISTS "System can delete sessions" ON public.customer_portal_sessions;

-- Business owners can manage sessions for their customers
CREATE POLICY "Business owners can manage sessions"
ON public.customer_portal_sessions
FOR ALL
USING (auth.uid() = business_user_id)
WITH CHECK (auth.uid() = business_user_id);

-- Allow session validation by token (for public portal access - read only)
CREATE POLICY "Valid sessions can be read by token"
ON public.customer_portal_sessions
FOR SELECT
USING (session_token IS NOT NULL AND expires_at > now());

-- Fix user_activity_logs RLS policies - require authenticated user matching
DROP POLICY IF EXISTS "System can insert activity logs" ON public.user_activity_logs;

-- Only authenticated users can insert their own activity logs
CREATE POLICY "Authenticated users can insert own activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix social_media_products - restrict to authenticated or valid public access
-- Keep public read for storefronts but add business owner write protection
DROP POLICY IF EXISTS "Anyone can view active products" ON public.social_media_products;
DROP POLICY IF EXISTS "Users can create social media products" ON public.social_media_products;
DROP POLICY IF EXISTS "Users can delete their social media products" ON public.social_media_products;
DROP POLICY IF EXISTS "Users can update their social media products" ON public.social_media_products;

-- Public can view active products (required for public storefronts)
CREATE POLICY "Public can view active products"
ON public.social_media_products
FOR SELECT
USING (is_active = true);

-- Business owners can manage their own products
CREATE POLICY "Business owners can manage products"
ON public.social_media_products
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix storefront_visits - add basic validation
DROP POLICY IF EXISTS "Anyone can record visits" ON public.storefront_visits;

-- Allow visit recording but require valid business_user_id exists
CREATE POLICY "Valid visits can be recorded"
ON public.storefront_visits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE user_id = storefront_visits.business_user_id
  )
);