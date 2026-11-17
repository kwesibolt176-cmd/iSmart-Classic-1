-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cashier', 'kitchen_staff', 'inventory_manager');

-- Create user_roles table for granular permissions
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost DECIMAL(10, 2),
  bnpl_enabled BOOLEAN NOT NULL DEFAULT false,
  low_stock_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_history table for audit log
CREATE TABLE public.inventory_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'stock_adjustment', 'sold', 'returned', 'deactivated'
  quantity_before INTEGER,
  quantity_after INTEGER,
  price_before DECIMAL(10, 2),
  price_after DECIMAL(10, 2),
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for inventory_items
CREATE POLICY "Users can view their inventory"
ON public.inventory_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and inventory managers can insert items"
ON public.inventory_items FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'))
);

CREATE POLICY "Admins and inventory managers can update items"
ON public.inventory_items FOR UPDATE
USING (
  auth.uid() = user_id AND 
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'))
);

CREATE POLICY "Admins can delete items"
ON public.inventory_items FOR DELETE
USING (
  auth.uid() = user_id AND 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for inventory_history
CREATE POLICY "Users can view their inventory history"
ON public.inventory_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert history"
ON public.inventory_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at on inventory_items
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log inventory changes
CREATE OR REPLACE FUNCTION public.log_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_history (
      user_id, inventory_item_id, action, quantity_after, price_after, changed_by
    ) VALUES (
      NEW.user_id, NEW.id, 'created', NEW.quantity, NEW.price, auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.quantity != NEW.quantity OR OLD.price != NEW.price THEN
      INSERT INTO public.inventory_history (
        user_id, inventory_item_id, action, 
        quantity_before, quantity_after, 
        price_before, price_after, 
        changed_by
      ) VALUES (
        NEW.user_id, NEW.id, 'updated',
        OLD.quantity, NEW.quantity,
        OLD.price, NEW.price,
        auth.uid()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to automatically log inventory changes
CREATE TRIGGER log_inventory_changes
AFTER INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.log_inventory_change();