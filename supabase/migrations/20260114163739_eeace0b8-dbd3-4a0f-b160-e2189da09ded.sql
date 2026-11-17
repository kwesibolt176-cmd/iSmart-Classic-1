-- Allow public read access to business_profiles for storefronts
CREATE POLICY "Public can view business profiles for storefronts"
ON public.business_profiles
FOR SELECT
USING (true);

-- Allow public read access to inventory_items for storefronts
CREATE POLICY "Public can view active storefront products"
ON public.inventory_items
FOR SELECT
USING (is_active = true AND show_on_storefront = true);

-- Allow public read access to categories for storefronts
CREATE POLICY "Public can view categories"
ON public.categories
FOR SELECT
USING (true);