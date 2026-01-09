
-- =====================================================
-- RELATION BIDIRECTIONNELLE ENTREPRISE <-> GESTIONNAIRE DE FLOTTE
-- Avec notifications temps réel - PARTIE 2 (correction)
-- =====================================================

-- 8. Activer realtime pour les notifications entreprise-gestionnaire
-- Utiliser DO block pour éviter l'erreur si déjà ajouté
DO $$
BEGIN
  -- Vérifier si la table est déjà dans la publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'company_course_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_course_requests;
  END IF;
END $$;
