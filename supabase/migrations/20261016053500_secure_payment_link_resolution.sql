-- Hosted checkout URLs contain public bearer tokens. Keep them visible only to
-- the owning merchant and resolve individual short codes through the public
-- edge function, which validates activity and expiry server-side.
DROP POLICY IF EXISTS "Anyone can view active payment links" ON public.payment_links;
