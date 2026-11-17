-- Create staff_business_assignments table for multi-business staff support
CREATE TABLE public.staff_business_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_auth_user_id UUID NOT NULL,
  business_user_id UUID NOT NULL,
  role_id UUID REFERENCES public.staff_roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,
  revoke_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_auth_user_id, business_user_id)
);

-- Add revocation columns to existing staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('active', 'suspended', 'revoked')),
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revoked_by UUID,
ADD COLUMN IF NOT EXISTS revoke_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.staff_business_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_business_assignments
CREATE POLICY "Business owners can view their staff assignments"
ON public.staff_business_assignments
FOR SELECT
USING (business_user_id = auth.uid());

CREATE POLICY "Business owners can create staff assignments"
ON public.staff_business_assignments
FOR INSERT
WITH CHECK (business_user_id = auth.uid());

CREATE POLICY "Business owners can update their staff assignments"
ON public.staff_business_assignments
FOR UPDATE
USING (business_user_id = auth.uid());

CREATE POLICY "Staff can view their own assignments"
ON public.staff_business_assignments
FOR SELECT
USING (staff_auth_user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_staff_business_assignments_updated_at
BEFORE UPDATE ON public.staff_business_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_staff_business_assignments_auth_user ON public.staff_business_assignments(staff_auth_user_id);
CREATE INDEX idx_staff_business_assignments_business ON public.staff_business_assignments(business_user_id);
CREATE INDEX idx_staff_access_status ON public.staff(access_status);