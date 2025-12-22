-- =====================================================
-- SYSTÈME DE PARTENARIAT CHAUFFEURS-GESTIONNAIRES
-- =====================================================

-- Table pour les partenariats entre gestionnaires de flotte et chauffeurs indépendants
CREATE TABLE public.fleet_driver_partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  
  -- Qui a initié la demande
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('fleet_manager', 'driver')),
  
  -- Termes du partenariat
  commission_percentage NUMERIC NOT NULL DEFAULT 10 CHECK (commission_percentage >= 0 AND commission_percentage <= 50),
  
  -- Statuts du partenariat
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'terminated')),
  
  -- Signatures du contrat
  fleet_manager_signed BOOLEAN DEFAULT false,
  fleet_manager_signed_at TIMESTAMP WITH TIME ZONE,
  driver_signed BOOLEAN DEFAULT false,
  driver_signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Contrat accepté = les deux ont signé
  contract_signed BOOLEAN GENERATED ALWAYS AS (fleet_manager_signed AND driver_signed) STORED,
  
  -- Message/Note lors de la proposition
  proposal_message TEXT,
  rejection_reason TEXT,
  
  -- Dates
  proposed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Un seul partenariat actif par couple gestionnaire/chauffeur
  UNIQUE(fleet_manager_id, driver_id)
);

-- Index pour performance
CREATE INDEX idx_fleet_driver_partnerships_fleet ON public.fleet_driver_partnerships(fleet_manager_id);
CREATE INDEX idx_fleet_driver_partnerships_driver ON public.fleet_driver_partnerships(driver_id);
CREATE INDEX idx_fleet_driver_partnerships_status ON public.fleet_driver_partnerships(status);

-- Enable RLS
ALTER TABLE public.fleet_driver_partnerships ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Fleet managers can view their partnerships"
  ON public.fleet_driver_partnerships
  FOR SELECT
  USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view their partnerships"
  ON public.fleet_driver_partnerships
  FOR SELECT
  USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Fleet managers can create partnerships"
  ON public.fleet_driver_partnerships
  FOR INSERT
  WITH CHECK (
    fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid())
    AND initiated_by = 'fleet_manager'
  );

CREATE POLICY "Drivers can create partnerships"
  ON public.fleet_driver_partnerships
  FOR INSERT
  WITH CHECK (
    driver_id = get_driver_id(auth.uid())
    AND initiated_by = 'driver'
  );

CREATE POLICY "Fleet managers can update their partnerships"
  ON public.fleet_driver_partnerships
  FOR UPDATE
  USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their partnerships"
  ON public.fleet_driver_partnerships
  FOR UPDATE
  USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins can manage all partnerships"
  ON public.fleet_driver_partnerships
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Ajouter des colonnes au profil gestionnaire pour visibilité chauffeurs
ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS visible_to_drivers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_profile_description TEXT,
ADD COLUMN IF NOT EXISTS default_partnership_commission NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS partnership_terms TEXT;

-- Fonction pour obtenir les gestionnaires visibles aux chauffeurs
CREATE OR REPLACE FUNCTION public.get_visible_fleet_managers()
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  logo_url TEXT,
  description TEXT,
  driver_profile_description TEXT,
  default_partnership_commission NUMERIC,
  address TEXT,
  total_drivers INTEGER,
  total_clients INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    fm.id,
    fm.company_name,
    fm.contact_name,
    CASE WHEN fm.show_email THEN fm.contact_email ELSE NULL END,
    fm.logo_url,
    fm.description,
    fm.driver_profile_description,
    fm.default_partnership_commission,
    CASE WHEN fm.show_address THEN fm.address ELSE NULL END,
    fm.total_drivers,
    fm.total_clients
  FROM fleet_managers fm
  WHERE fm.visible_to_drivers = true
    AND fm.status = 'validated'
    AND fm.subscription_status = 'active';
$$;

-- Fonction pour vérifier disponibilité chauffeur avant assignation
CREATE OR REPLACE FUNCTION public.get_available_fleet_drivers_for_course(
  p_fleet_manager_id UUID,
  p_scheduled_date TIMESTAMP WITH TIME ZONE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  rating NUMERIC,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS driver_id,
    p.full_name AS driver_name,
    d.rating,
    check_driver_availability(d.id, p_scheduled_date, p_duration_minutes) AS is_available
  FROM drivers d
  JOIN fleet_manager_drivers fmd ON d.id = fmd.driver_id
  JOIN profiles p ON d.user_id = p.id
  WHERE fmd.fleet_manager_id = p_fleet_manager_id
    AND fmd.status = 'active'
    AND d.status = 'validated'
  ORDER BY 
    check_driver_availability(d.id, p_scheduled_date, p_duration_minutes) DESC,
    d.rating DESC NULLS LAST;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_fleet_driver_partnerships_updated_at
  BEFORE UPDATE ON public.fleet_driver_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();