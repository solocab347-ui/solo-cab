-- AUDIT FIX: Mettre à jour les politiques RLS pour inclure les pionniers et la période de grâce

-- 1. Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Public can view limited driver profiles" ON drivers;

-- 2. Créer une nouvelle politique cohérente avec la logique pionnier/grâce
CREATE POLICY "Public can view limited driver profiles" ON drivers
FOR SELECT
TO public
USING (
  public_profile_enabled = true
  AND (
    -- Chauffeurs validés
    status = 'validated'
    -- OU Pionniers avec essai actif
    OR (is_pioneer = true AND free_access_end_date > now())
    -- OU Chauffeurs en période de grâce 30 jours
    OR (created_at > (now() - interval '30 days') AND status IN ('pending', 'validated'))
  )
);

-- 3. Mettre à jour la politique pour les clients libres
DROP POLICY IF EXISTS "Free clients can view all public drivers" ON drivers;

CREATE POLICY "Free clients can view all public drivers" ON drivers
FOR SELECT
TO public
USING (
  public_profile_enabled = true
  AND (
    status = 'validated'
    OR (is_pioneer = true AND free_access_end_date > now())
    OR (created_at > (now() - interval '30 days') AND status IN ('pending', 'validated'))
  )
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.user_id = auth.uid() AND clients.is_exclusive = false
  )
);

-- 4. Mettre à jour la politique pour les entreprises
DROP POLICY IF EXISTS "Companies can view drivers visible to companies" ON drivers;

CREATE POLICY "Companies can view drivers visible to companies" ON drivers
FOR SELECT
TO public
USING (
  (visible_to_companies = true OR public_profile_enabled = true)
  AND (
    status = 'validated'
    OR (is_pioneer = true AND free_access_end_date > now())
    OR (created_at > (now() - interval '30 days') AND status IN ('pending', 'validated'))
  )
  AND EXISTS (
    SELECT 1 FROM companies c WHERE c.user_id = auth.uid()
  )
);

-- 5. Mettre à jour la politique pour les gestionnaires de flotte
DROP POLICY IF EXISTS "Fleet managers can view searchable drivers" ON drivers;

CREATE POLICY "Fleet managers can view searchable drivers" ON drivers
FOR SELECT
TO public
USING (
  visible_to_fleet_managers = true
  AND (
    status = 'validated'
    OR (is_pioneer = true AND free_access_end_date > now())
    OR (created_at > (now() - interval '30 days') AND status IN ('pending', 'validated'))
  )
  AND fleet_manager_id IS NULL
  AND EXISTS (
    SELECT 1 FROM fleet_managers fm WHERE fm.user_id = auth.uid()
  )
);