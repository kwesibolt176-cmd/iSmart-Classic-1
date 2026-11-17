-- Create super admin permissions table for granular control
CREATE TABLE public.super_admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.super_admin_permissions ENABLE ROW LEVEL SECURITY;

-- Only super admins can view permissions
CREATE POLICY "Super admins can view all permissions"
ON public.super_admin_permissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super admins can manage permissions
CREATE POLICY "Super admins can manage permissions"
ON public.super_admin_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Function to check super admin permission
CREATE OR REPLACE FUNCTION public.has_super_admin_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admin_permissions
    WHERE user_id = _user_id
      AND permission_key = _permission
  )
$$;

-- Add index for faster lookups
CREATE INDEX idx_super_admin_permissions_user ON public.super_admin_permissions(user_id);
CREATE INDEX idx_super_admin_permissions_key ON public.super_admin_permissions(permission_key);