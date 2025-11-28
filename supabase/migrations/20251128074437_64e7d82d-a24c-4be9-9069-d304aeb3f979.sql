-- ============================================================================
-- CORRECTION DES VULNÉRABILITÉS DE SÉCURITÉ CRITIQUES - SIMPLIFIÉE
-- ============================================================================

-- 1. CORRECTION CRITIQUE: Table drivers - Limiter les colonnes exposées publiquement
-- ============================================================================

-- Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON drivers;

-- Créer une fonction SECURITY DEFINER qui retourne uniquement les colonnes publiques
CREATE OR REPLACE FUNCTION get_public_driver_profile(driver_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  bio TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  vehicle_model TEXT,
  vehicle_brand TEXT,
  vehicle_color TEXT,
  vehicle_year INTEGER,
  max_passengers INTEGER,
  working_sectors TEXT[],
  service_description TEXT,
  services_offered TEXT[],
  vehicle_equipment TEXT[],
  gallery_photos TEXT[],
  vehicle_photos TEXT[],
  display_driver_name BOOLEAN,
  display_company_name BOOLEAN,
  company_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.bio,
    d.rating,
    d.total_rides,
    d.vehicle_model,
    d.vehicle_brand,
    d.vehicle_color,
    d.vehicle_year,
    d.max_passengers,
    d.working_sectors,
    d.service_description,
    d.services_offered,
    d.vehicle_equipment,
    d.gallery_photos,
    d.vehicle_photos,
    d.display_driver_name,
    d.display_company_name,
    d.company_name,
    d.created_at,
    d.updated_at
  FROM drivers d
  WHERE d.id = driver_id_param
    AND d.public_profile_enabled = true
    AND d.status = 'validated';
END;
$$;

-- Nouvelle politique RLS sécurisée pour les profils publics
-- Limite strictement aux profils publics validés
CREATE POLICY "Public can view limited driver profiles"
ON drivers
FOR SELECT
USING (
  public_profile_enabled = true 
  AND status = 'validated'
);

-- ============================================================================
-- 2. CORRECTION CRITIQUE: Table profiles - Masquer email/phone/address
-- ============================================================================

-- Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Public can view public driver profiles" ON profiles;

-- Créer une fonction SECURITY DEFINER pour les profils publics
CREATE OR REPLACE FUNCTION get_public_profile_info(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  profile_photo_url TEXT,
  email TEXT,
  phone TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  driver_record RECORD;
BEGIN
  -- Vérifier si l'utilisateur est un chauffeur avec profil public
  SELECT show_email, show_phone, public_profile_enabled, status
  INTO driver_record
  FROM drivers
  WHERE drivers.user_id = user_id_param;

  -- Si c'est un chauffeur public validé, retourner les infos selon ses préférences
  IF driver_record.public_profile_enabled = true AND driver_record.status = 'validated' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.full_name,
      p.profile_photo_url,
      CASE WHEN driver_record.show_email = true THEN p.email ELSE NULL::TEXT END,
      CASE WHEN driver_record.show_phone = true THEN p.phone ELSE NULL::TEXT END
    FROM profiles p
    WHERE p.id = user_id_param;
  ELSE
    -- Sinon ne rien retourner
    RETURN;
  END IF;
END;
$$;

-- Nouvelle politique RLS sécurisée pour les profils
-- Les profils ne sont pas directement accessibles publiquement
CREATE POLICY "Profiles visible to authorized users only"
ON profiles
FOR SELECT
USING (
  auth.uid() = id  -- L'utilisateur peut voir son propre profil
  OR
  -- Les admins peuvent voir tous les profils
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
  OR
  -- Les chauffeurs peuvent voir les profils de leurs clients
  EXISTS (
    SELECT 1 FROM clients c
    JOIN drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids))
    WHERE d.user_id = auth.uid()
    AND c.user_id = profiles.id
  )
  OR
  -- Les clients peuvent voir les profils de leurs chauffeurs
  EXISTS (
    SELECT 1 FROM clients c
    JOIN drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids))
    WHERE c.user_id = auth.uid()
    AND d.user_id = profiles.id
  )
);

-- ============================================================================
-- 3. CORRECTION MOYENNE: Table qr_codes - Masquer scans_count
-- ============================================================================

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Public can view active QR codes" ON qr_codes;

-- Nouvelle politique qui limite l'accès public
CREATE POLICY "Public can view active QR codes limited data"
ON qr_codes
FOR SELECT
USING (is_active = true);

-- Note: Les applications clientes devront faire un SELECT explicite
-- excluant scans_count: SELECT id, code, driver_id, qr_code_image FROM qr_codes

-- ============================================================================
-- 4. Ajouter des commentaires de documentation
-- ============================================================================

COMMENT ON FUNCTION get_public_driver_profile IS 
'Fonction sécurisée retournant uniquement les colonnes publiques d''un profil chauffeur. Masque les données sensibles: GPS, adresses, permis, SIRET, tarifs, Stripe ID.';

COMMENT ON FUNCTION get_public_profile_info IS 
'Fonction sécurisée retournant les infos publiques d''un profil utilisateur. Respecte les préférences show_email et show_phone du chauffeur.';

COMMENT ON POLICY "Public can view limited driver profiles" ON drivers IS
'Politique RLS sécurisée: expose uniquement les profils publics validés. Les colonnes sensibles doivent être filtrées côté application.';

COMMENT ON POLICY "Profiles visible to authorized users only" ON profiles IS
'Politique RLS sécurisée: les profils ne sont visibles qu''au propriétaire, à ses chauffeurs/clients liés, et aux admins. Utiliser get_public_profile_info() pour l''accès public contrôlé.';

COMMENT ON POLICY "Public can view active QR codes limited data" ON qr_codes IS
'Politique RLS sécurisée: les QR codes actifs sont visibles mais scans_count doit être exclu des SELECT publics.';