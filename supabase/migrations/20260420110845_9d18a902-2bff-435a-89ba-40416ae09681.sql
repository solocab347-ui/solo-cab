-- ============================================
-- HARDENING SÉCURITÉ POST-AUDIT (2026-04-20)
-- 1. Restreindre l'accès chauffeur aux données financières des clients
-- 2. Restreindre l'accès public aux données sensibles des chauffeurs
-- 3. Nettoyer les policies trop larges du bucket fleet-documents
-- ============================================

-- ============================================
-- 1. CLIENTS — Vue safe pour chauffeurs (sans données financières)
-- ============================================

-- Créer/Remplacer la vue safe
CREATE OR REPLACE VIEW public.clients_safe_for_drivers
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.user_id,
  c.driver_id,
  c.driver_ids,
  c.fleet_manager_id,
  c.favorite_driver_id,
  c.preferred_fleet_driver_id,
  c.is_exclusive,
  c.qr_code_id,
  c.total_rides,
  c.total_spent,
  c.reliability_score,
  c.abusive_ratings_count,
  c.total_ratings_given,
  c.created_at,
  c.updated_at
  -- Volontairement EXCLUS : stripe_customer_id, saved_cards, default_payment_method_id
FROM public.clients c;

GRANT SELECT ON public.clients_safe_for_drivers TO authenticated;

-- Remplacer la policy chauffeur trop permissive sur la table clients
DROP POLICY IF EXISTS "Drivers can view all their clients (dual association)" ON public.clients;

-- Nouvelle policy restreinte : les chauffeurs ne peuvent voir leurs clients
-- que via la vue safe. La table directe n'est plus accessible aux chauffeurs.
-- (Les clients gardent l'accès à leur propre profil via "Clients can view their own profile")
-- (Les admins gardent leur accès via "Admins can manage all clients")

-- ============================================
-- 2. DRIVERS — Vue safe enrichie (sans données financières / personnelles)
-- ============================================

-- safe_driver_profiles existe déjà ; on s'assure qu'aucune donnée sensible
-- ne fuit via les policies SELECT trop larges sur la table drivers elle-même.

-- Identifier et restreindre les policies SELECT publiques sur drivers
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Lister les policies SELECT actuelles pour audit
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'drivers' AND cmd = 'SELECT'
      AND policyname NOT IN (
        'Admins can view all drivers',
        'Drivers can view their own profile',
        'Service role full access drivers'
      )
  LOOP
    -- On les supprime pour forcer l'accès via les vues safe
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.drivers', pol.policyname);
    RAISE NOTICE 'Dropped over-permissive policy: %', pol.policyname;
  END LOOP;
END $$;

-- Garantir qu'il existe une policy stricte propriétaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='drivers'
      AND policyname='Drivers can view their own profile'
  ) THEN
    CREATE POLICY "Drivers can view their own profile"
      ON public.drivers FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='drivers'
      AND policyname='Admins can view all drivers'
  ) THEN
    CREATE POLICY "Admins can view all drivers"
      ON public.drivers FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::text));
  END IF;
END $$;

-- ============================================
-- 3. STORAGE — Cleanup bucket fleet-documents
-- Supprimer les policies trop larges qui shadow les folder-scoped
-- ============================================

DROP POLICY IF EXISTS "Fleet managers can view their own fleet documents" ON storage.objects;
DROP POLICY IF EXISTS "Fleet managers can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Fleet managers can delete their files" ON storage.objects;

-- Les policies folder-scoped restantes assurent l'isolation correcte :
-- - "Fleet managers can view their own documents" (SELECT, folder-scoped)
-- - "Fleet managers can update their own documents" (UPDATE, folder-scoped)
-- - "Fleet managers can delete their own documents" (DELETE, folder-scoped)

-- Recréer la policy admin pour qu'elle reste accessible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Admins can view all fleet documents'
  ) THEN
    CREATE POLICY "Admins can view all fleet documents"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'fleet-documents' AND has_role(auth.uid(), 'admin'::text));
  END IF;
END $$;

-- ============================================
-- 4. GEOCODING_CACHE — Restreindre aux authentifiés
-- ============================================

DROP POLICY IF EXISTS "Allow public read geocoding cache" ON public.geocoding_cache;

CREATE POLICY "Authenticated users can read geocoding cache"
  ON public.geocoding_cache FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 5. CONGRESS_INVITATIONS — Limiter exposition pricing
-- ============================================

DROP POLICY IF EXISTS "Public can view active invitations by slug" ON public.congress_invitations;

CREATE POLICY "Authenticated can view active invitations"
  ON public.congress_invitations FOR SELECT
  TO authenticated
  USING (is_active = true);
