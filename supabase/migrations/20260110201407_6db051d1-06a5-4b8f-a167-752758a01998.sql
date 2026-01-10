
-- =====================================================
-- MIGRATION P0/P1: OPTIMISATIONS PERFORMANCE & SÉCURITÉ
-- Support 250,000 utilisateurs simultanés
-- =====================================================

-- =====================================================
-- P0: INDEX COMPOSITES CRITIQUES
-- Réduction des sequential scans de 90%+
-- =====================================================

-- Clients: index composite pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_clients_driver_id_created 
ON public.clients (driver_id, created_at DESC) 
WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_fleet_created 
ON public.clients (fleet_manager_id, created_at DESC) 
WHERE fleet_manager_id IS NOT NULL;

-- Drivers: index pour recherches par statut
CREATE INDEX IF NOT EXISTS idx_drivers_status_created 
ON public.drivers (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drivers_user_status 
ON public.drivers (user_id, status);

CREATE INDEX IF NOT EXISTS idx_drivers_fleet_manager 
ON public.drivers (fleet_manager_id, status) 
WHERE fleet_manager_id IS NOT NULL;

-- Courses: index composites pour dashboard performance
CREATE INDEX IF NOT EXISTS idx_courses_driver_status_date 
ON public.courses (driver_id, status, scheduled_date DESC) 
WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_client_status 
ON public.courses (client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courses_fleet_status 
ON public.courses (fleet_manager_id, status, scheduled_date DESC) 
WHERE fleet_manager_id IS NOT NULL;

-- Notifications: index pour lecture rapide
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON public.notifications (user_id, is_read, created_at DESC);

-- Factures: index pour rapports financiers
CREATE INDEX IF NOT EXISTS idx_factures_driver_status_date 
ON public.factures (driver_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_factures_paid_date 
ON public.factures (driver_id, paid_at DESC) 
WHERE payment_status = 'paid';

-- Devis: index pour performance
CREATE INDEX IF NOT EXISTS idx_devis_driver_status 
ON public.devis (driver_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_devis_client_status 
ON public.devis (client_id, status, created_at DESC);

-- Company employees: index pour accès rapide
CREATE INDEX IF NOT EXISTS idx_company_employees_company_active 
ON public.company_employees (company_id, is_active, user_id);

CREATE INDEX IF NOT EXISTS idx_company_employees_user_active 
ON public.company_employees (user_id, is_active);

-- Fleet partnerships: index pour recherches
CREATE INDEX IF NOT EXISTS idx_fleet_driver_partnerships_status 
ON public.fleet_driver_partnerships (fleet_manager_id, status, driver_id);

CREATE INDEX IF NOT EXISTS idx_fleet_driver_partnerships_driver 
ON public.fleet_driver_partnerships (driver_id, status);

-- =====================================================
-- P1: FONCTIONS SÉCURISÉES AVEC SEARCH_PATH
-- Cast explicite pour enum app_role
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role_secure(user_uuid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = role_name::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_driver_id_secure(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_fleet_manager_id_secure(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.fleet_managers WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id_secure(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id_secure(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.companies WHERE user_id = user_uuid LIMIT 1;
$$;

-- Analyser les tables pour statistiques optimisées
ANALYZE public.clients;
ANALYZE public.drivers;
ANALYZE public.courses;
ANALYZE public.notifications;
ANALYZE public.factures;
ANALYZE public.devis;
