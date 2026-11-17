-- Create enum for bank/fintech status
CREATE TYPE public.bank_status AS ENUM ('active', 'inactive', 'pending', 'suspended');

-- Create enum for connection status
CREATE TYPE public.bank_connection_status AS ENUM ('connected', 'pending', 'disconnected', 'revoked');

-- Banks and Fintechs table (platform level)
CREATE TABLE public.banks_fintechs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    description TEXT,
    provider_type TEXT NOT NULL DEFAULT 'bank', -- 'bank' or 'fintech'
    status bank_status NOT NULL DEFAULT 'pending',
    api_endpoint TEXT,
    supported_features TEXT[] DEFAULT '{}',
    supported_countries TEXT[] DEFAULT '{GH}',
    documentation_url TEXT,
    contact_email TEXT,
    is_globally_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank API credentials (encrypted, managed by super admin)
CREATE TABLE public.bank_api_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id UUID NOT NULL REFERENCES public.banks_fintechs(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL, -- 'api_key', 'client_id', 'client_secret', etc.
    encrypted_value TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'sandbox', -- 'sandbox' or 'production'
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business bank connections
CREATE TABLE public.business_bank_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES public.banks_fintechs(id) ON DELETE CASCADE,
    status bank_connection_status NOT NULL DEFAULT 'pending',
    connected_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    consent_given_at TIMESTAMP WITH TIME ZONE,
    consent_expires_at TIMESTAMP WITH TIME ZONE,
    permissions TEXT[] DEFAULT '{}', -- e.g., ['balances', 'transactions', 'settlements']
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, bank_id)
);

-- Bank integration logs (audit trail)
CREATE TABLE public.bank_integration_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id UUID REFERENCES public.banks_fintechs(id) ON DELETE SET NULL,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    endpoint TEXT,
    request_method TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    ip_address TEXT,
    user_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banks_fintechs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_integration_logs ENABLE ROW LEVEL SECURITY;

-- Banks table policies (publicly readable for enabled banks)
CREATE POLICY "Anyone can view globally enabled banks"
ON public.banks_fintechs
FOR SELECT
USING (is_globally_enabled = true AND status = 'active');

CREATE POLICY "Super admins can manage banks"
ON public.banks_fintechs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Bank API credentials policies (super admin only)
CREATE POLICY "Super admins can manage bank credentials"
ON public.bank_api_credentials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Business bank connections policies
CREATE POLICY "Businesses can view their bank connections"
ON public.business_bank_connections
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_profiles bp
        WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
);

CREATE POLICY "Businesses can manage their bank connections"
ON public.business_bank_connections
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_profiles bp
        WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.business_profiles bp
        WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
);

CREATE POLICY "Super admins can view all bank connections"
ON public.business_bank_connections
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Bank integration logs policies
CREATE POLICY "Businesses can view their integration logs"
ON public.bank_integration_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.business_profiles bp
        WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
);

CREATE POLICY "Super admins can manage all integration logs"
ON public.bank_integration_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create updated_at triggers
CREATE TRIGGER update_banks_fintechs_updated_at
BEFORE UPDATE ON public.banks_fintechs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_api_credentials_updated_at
BEFORE UPDATE ON public.bank_api_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_bank_connections_updated_at
BEFORE UPDATE ON public.business_bank_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_banks_status ON public.banks_fintechs(status);
CREATE INDEX idx_banks_globally_enabled ON public.banks_fintechs(is_globally_enabled);
CREATE INDEX idx_business_bank_connections_business ON public.business_bank_connections(business_id);
CREATE INDEX idx_business_bank_connections_bank ON public.business_bank_connections(bank_id);
CREATE INDEX idx_bank_integration_logs_bank ON public.bank_integration_logs(bank_id);
CREATE INDEX idx_bank_integration_logs_business ON public.bank_integration_logs(business_id);
CREATE INDEX idx_bank_integration_logs_created ON public.bank_integration_logs(created_at DESC);