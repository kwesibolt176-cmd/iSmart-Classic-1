-- QA/UAT remediation: tenant settings and business invariants.

CREATE TABLE IF NOT EXISTS public.pos_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_print_receipts boolean NOT NULL DEFAULT true,
  tips_enabled boolean NOT NULL DEFAULT true,
  default_tip_percentage numeric(5,2) NOT NULL DEFAULT 15
    CHECK (default_tip_percentage >= 0 AND default_tip_percentage <= 100),
  sound_notifications boolean NOT NULL DEFAULT true,
  email_receipts boolean NOT NULL DEFAULT false,
  receipt_footer text NOT NULL DEFAULT 'thankyou'
    CHECK (receipt_footer IN ('thankyou', 'visit', 'custom')),
  vat_nhil_enabled boolean NOT NULL DEFAULT true,
  vat_rate numeric(5,2) NOT NULL DEFAULT 15
    CHECK (vat_rate >= 0 AND vat_rate <= 100),
  nhil_rate numeric(5,2) NOT NULL DEFAULT 2.5
    CHECK (nhil_rate >= 0 AND nhil_rate <= 100),
  service_charge_enabled boolean NOT NULL DEFAULT false,
  service_charge_rate numeric(5,2) NOT NULL DEFAULT 10
    CHECK (service_charge_rate >= 0 AND service_charge_rate <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their POS settings" ON public.pos_settings;
CREATE POLICY "Users can view their POS settings"
ON public.pos_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their POS settings" ON public.pos_settings;
CREATE POLICY "Users can create their POS settings"
ON public.pos_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their POS settings" ON public.pos_settings;
CREATE POLICY "Users can update their POS settings"
ON public.pos_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_pos_settings_updated_at ON public.pos_settings;
CREATE TRIGGER update_pos_settings_updated_at
BEFORE UPDATE ON public.pos_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reject future duplicate category names without rewriting existing merchant data.
-- A trigger is intentionally used instead of an immediate unique index because legacy
-- tenants may already contain duplicates that require a separately reviewed cleanup.
CREATE OR REPLACE FUNCTION public.enforce_tenant_category_name_unique()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  IF NEW.name = '' THEN
    RAISE EXCEPTION 'Category name is required' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = NEW.user_id
      AND lower(btrim(c.name)) = lower(NEW.name)
      AND c.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'A category with this name already exists' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS categories_tenant_name_unique ON public.categories;
CREATE TRIGGER categories_tenant_name_unique
BEFORE INSERT OR UPDATE OF name, user_id ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_category_name_unique();

-- New purchase orders must reference an active supplier belonging to the same tenant.
-- Historical orders remain intact when a supplier is later deactivated.
CREATE OR REPLACE FUNCTION public.validate_active_supplier_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.id = NEW.supplier_id
      AND s.user_id = NEW.user_id
      AND s.is_active = true
  ) THEN
    RAISE EXCEPTION 'Supplier must be active and belong to this business' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_orders_active_supplier ON public.supplier_orders;
CREATE TRIGGER supplier_orders_active_supplier
BEFORE INSERT OR UPDATE OF supplier_id, user_id ON public.supplier_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_active_supplier_order();

-- Prevent duplicate in-progress records for the same business/location/date.
CREATE OR REPLACE FUNCTION public.enforce_daily_checklist_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.end_of_day_checklists e
    WHERE e.user_id = NEW.user_id
      AND e.shift_date = NEW.shift_date
      AND e.location_id IS NOT DISTINCT FROM NEW.location_id
      AND e.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'A checklist already exists for this business, location, and date' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS end_of_day_checklist_scope_unique ON public.end_of_day_checklists;
CREATE TRIGGER end_of_day_checklist_scope_unique
BEFORE INSERT OR UPDATE OF user_id, location_id, shift_date ON public.end_of_day_checklists
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_checklist_scope();

ALTER TABLE public.tax_configurations
ADD COLUMN IF NOT EXISTS vat_registration_threshold numeric(15,2) NOT NULL DEFAULT 200000
CHECK (vat_registration_threshold >= 0);

-- Public browsing must not expose inactive categories.
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view active categories"
ON public.categories FOR SELECT
USING (is_active = true OR auth.uid() = user_id);

-- Reusable active-only announcement query. RLS remains the authorization boundary.
CREATE OR REPLACE FUNCTION public.get_active_staff_announcements(p_user_id uuid)
RETURNS SETOF public.staff_announcements
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT a.*
  FROM public.staff_announcements a
  WHERE a.user_id = p_user_id
    AND a.is_active = true
    AND (a.expires_at IS NULL OR a.expires_at > now())
  ORDER BY a.created_at DESC;
$$;
