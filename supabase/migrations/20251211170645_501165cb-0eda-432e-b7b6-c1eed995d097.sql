-- Create fleet_managers table
CREATE TABLE public.fleet_managers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    siret TEXT NOT NULL,
    siren TEXT,
    address TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    subscription_paid BOOLEAN DEFAULT false,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_stripe_id TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    show_drivers_in_public_storefront BOOLEAN DEFAULT true,
    qr_code_id UUID,
    total_drivers INTEGER DEFAULT 0,
    total_clients INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create fleet_manager_drivers junction table
CREATE TABLE public.fleet_manager_drivers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(fleet_manager_id, driver_id)
);

-- Create fleet_manager_clients junction table (clients registered via fleet manager QR)
CREATE TABLE public.fleet_manager_clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(fleet_manager_id, client_id)
);

-- Create fleet_manager_invitations table for driver invitations
CREATE TABLE public.fleet_manager_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    email TEXT,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_driver_id UUID REFERENCES public.drivers(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create QR codes for fleet managers
CREATE TABLE public.fleet_manager_qr_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    qr_code_image TEXT,
    is_active BOOLEAN DEFAULT true,
    scans_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(fleet_manager_id)
);

-- Add fleet_manager role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fleet_manager';

-- Enable RLS on all new tables
ALTER TABLE public.fleet_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_manager_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_manager_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_manager_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_manager_qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fleet_managers
CREATE POLICY "Fleet managers can view their own profile"
ON public.fleet_managers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Fleet managers can update their own profile"
ON public.fleet_managers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fleet manager profile"
ON public.fleet_managers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all fleet managers"
ON public.fleet_managers FOR ALL
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- RLS Policies for fleet_manager_drivers
CREATE POLICY "Fleet managers can view their drivers"
ON public.fleet_manager_drivers FOR SELECT
USING (fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Fleet managers can manage their drivers"
ON public.fleet_manager_drivers FOR ALL
USING (fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view their fleet manager association"
ON public.fleet_manager_drivers FOR SELECT
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all fleet manager drivers"
ON public.fleet_manager_drivers FOR ALL
USING (has_role(auth.uid(), 'admin'::text));

-- RLS Policies for fleet_manager_clients
CREATE POLICY "Fleet managers can view their clients"
ON public.fleet_manager_clients FOR SELECT
USING (fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Fleet managers can manage their clients"
ON public.fleet_manager_clients FOR ALL
USING (fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all fleet manager clients"
ON public.fleet_manager_clients FOR ALL
USING (has_role(auth.uid(), 'admin'::text));

-- RLS Policies for fleet_manager_invitations
CREATE POLICY "Fleet managers can view their invitations"
ON public.fleet_manager_invitations FOR SELECT
USING (fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Fleet managers can manage their invitations"
ON public.fleet_manager_invitations FOR ALL
USING (fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view unused invitations for validation"
ON public.fleet_manager_invitations FOR SELECT
USING (used = false);

CREATE POLICY "Admins can manage all fleet manager invitations"
ON public.fleet_manager_invitations FOR ALL
USING (has_role(auth.uid(), 'admin'::text));

-- RLS Policies for fleet_manager_qr_codes
CREATE POLICY "Fleet managers can manage their QR codes"
ON public.fleet_manager_qr_codes FOR ALL
USING (fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Public can view active fleet manager QR codes"
ON public.fleet_manager_qr_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all fleet manager QR codes"
ON public.fleet_manager_qr_codes FOR ALL
USING (has_role(auth.uid(), 'admin'::text));

-- Function to get fleet manager ID
CREATE OR REPLACE FUNCTION public.get_fleet_manager_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.fleet_managers WHERE user_id = _user_id
$$;

-- Indexes for performance
CREATE INDEX idx_fleet_managers_user_id ON public.fleet_managers(user_id);
CREATE INDEX idx_fleet_managers_status ON public.fleet_managers(status);
CREATE INDEX idx_fleet_manager_drivers_fleet_manager_id ON public.fleet_manager_drivers(fleet_manager_id);
CREATE INDEX idx_fleet_manager_drivers_driver_id ON public.fleet_manager_drivers(driver_id);
CREATE INDEX idx_fleet_manager_clients_fleet_manager_id ON public.fleet_manager_clients(fleet_manager_id);
CREATE INDEX idx_fleet_manager_invitations_token ON public.fleet_manager_invitations(token);
CREATE INDEX idx_fleet_manager_qr_codes_code ON public.fleet_manager_qr_codes(code);