-- Fix security issues by adding DELETE policies and preventing modifications to audit logs

-- 1. Prevent DELETE and UPDATE on inventory_history (audit trail should be immutable)
CREATE POLICY "Prevent updates to history"
ON public.inventory_history
FOR UPDATE
USING (false);

CREATE POLICY "Prevent deletes from history"
ON public.inventory_history
FOR DELETE
USING (false);

-- 2. Prevent DELETE on business_profiles (or restrict to admins only)
CREATE POLICY "Prevent deletion of business profiles"
ON public.business_profiles
FOR DELETE
USING (false);

-- 3. Prevent DELETE on feature_settings
CREATE POLICY "Prevent deletion of feature settings"
ON public.feature_settings
FOR DELETE
USING (false);

-- 4. Create categories table for dynamic category management
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
ON public.categories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.categories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.categories
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();