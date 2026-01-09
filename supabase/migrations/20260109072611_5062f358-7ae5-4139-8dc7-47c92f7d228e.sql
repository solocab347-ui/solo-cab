
-- =====================================================
-- AUDIT SÉCURITÉ: ISOLATION STRICTE DES COURSES
-- =====================================================
-- Ce script renforce la sécurité RLS pour garantir
-- l'isolation complète entre chauffeurs et gestionnaires
-- =====================================================

-- Supprimer les anciennes politiques potentiellement vulnérables sur courses
DROP POLICY IF EXISTS "Fleet managers can view their created courses" ON public.courses;
DROP POLICY IF EXISTS "Fleet managers can update their created courses" ON public.courses;
DROP POLICY IF EXISTS "Fleet managers can create courses" ON public.courses;

-- Politique stricte: Le gestionnaire ne voit QUE les courses qu'il a créées OU partagées avec lui
CREATE POLICY "Fleet managers can only view their own or shared courses"
ON public.courses
FOR SELECT
USING (
  -- Le gestionnaire est propriétaire de la course
  (fleet_manager_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM fleet_managers fm 
    WHERE fm.id = courses.fleet_manager_id 
    AND fm.user_id = auth.uid()
  ))
  OR
  -- La course a été partagée avec le gestionnaire via fleet_partner_courses
  (EXISTS (
    SELECT 1 FROM fleet_partner_courses fpc
    JOIN fleet_managers fm ON fm.id = fpc.fleet_manager_id
    WHERE fpc.course_id = courses.id
    AND fm.user_id = auth.uid()
    AND fpc.status NOT IN ('cancelled', 'declined')
  ))
);

-- Le gestionnaire ne peut mettre à jour QUE ses propres courses
CREATE POLICY "Fleet managers can only update their own courses"
ON public.courses
FOR UPDATE
USING (
  fleet_manager_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM fleet_managers fm 
    WHERE fm.id = courses.fleet_manager_id 
    AND fm.user_id = auth.uid()
  )
);

-- Le gestionnaire ne peut créer QUE des courses avec son fleet_manager_id
CREATE POLICY "Fleet managers can only create their own courses"
ON public.courses
FOR INSERT
WITH CHECK (
  fleet_manager_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM fleet_managers fm 
    WHERE fm.id = courses.fleet_manager_id 
    AND fm.user_id = auth.uid()
  )
);

-- =====================================================
-- SÉCURITÉ: fleet_partner_courses - isolation stricte
-- =====================================================

-- S'assurer que les politiques RLS sont strictes sur fleet_partner_courses
DROP POLICY IF EXISTS "Fleet manager can view their shared courses" ON public.fleet_partner_courses;
DROP POLICY IF EXISTS "Fleet manager can create shared courses" ON public.fleet_partner_courses;
DROP POLICY IF EXISTS "Fleet manager can update their shared courses" ON public.fleet_partner_courses;
DROP POLICY IF EXISTS "Partner driver can view courses sent to them" ON public.fleet_partner_courses;
DROP POLICY IF EXISTS "Partner driver can update their assigned courses" ON public.fleet_partner_courses;

-- Gestionnaire: vue stricte
CREATE POLICY "Fleet manager strict view policy"
ON public.fleet_partner_courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM fleet_managers fm 
    WHERE fm.id = fleet_partner_courses.fleet_manager_id 
    AND fm.user_id = auth.uid()
  )
);

-- Gestionnaire: création stricte
CREATE POLICY "Fleet manager strict insert policy"
ON public.fleet_partner_courses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM fleet_managers fm 
    WHERE fm.id = fleet_partner_courses.fleet_manager_id 
    AND fm.user_id = auth.uid()
  )
);

-- Gestionnaire: mise à jour stricte
CREATE POLICY "Fleet manager strict update policy"
ON public.fleet_partner_courses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM fleet_managers fm 
    WHERE fm.id = fleet_partner_courses.fleet_manager_id 
    AND fm.user_id = auth.uid()
  )
);

-- Chauffeur partenaire: vue stricte (uniquement les courses qui lui sont assignées)
CREATE POLICY "Partner driver strict view policy"
ON public.fleet_partner_courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.id = fleet_partner_courses.driver_id 
    AND d.user_id = auth.uid()
  )
);

-- Chauffeur partenaire: mise à jour stricte (uniquement ses propres assignations)
CREATE POLICY "Partner driver strict update policy"
ON public.fleet_partner_courses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.id = fleet_partner_courses.driver_id 
    AND d.user_id = auth.uid()
  )
);

-- =====================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =====================================================
COMMENT ON POLICY "Fleet managers can only view their own or shared courses" ON public.courses IS 
'SÉCURITÉ CRITIQUE: Le gestionnaire ne peut voir que les courses qu''il a créées (fleet_manager_id) ou celles partagées explicitement avec lui via fleet_partner_courses. JAMAIS les courses personnelles des chauffeurs.';

COMMENT ON POLICY "Fleet manager strict view policy" ON public.fleet_partner_courses IS 
'ISOLATION: Le gestionnaire ne voit que les partages de cours dans lesquels il est impliqué.';

COMMENT ON POLICY "Partner driver strict view policy" ON public.fleet_partner_courses IS 
'ISOLATION: Le chauffeur partenaire ne voit que les courses qui lui sont spécifiquement assignées.';
