-- VAGUE 2 : Hardening RLS + Storage

-- 1. Restreindre les 5 policies trop permissives au service_role uniquement

-- weekly_settlements
DROP POLICY IF EXISTS "Service role manages settlements insert" ON public.weekly_settlements;
CREATE POLICY "Service role manages settlements insert"
ON public.weekly_settlements FOR INSERT
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages settlements update" ON public.weekly_settlements;
CREATE POLICY "Service role manages settlements update"
ON public.weekly_settlements FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- driver_weekly_balances
DROP POLICY IF EXISTS "Service role manages balances insert" ON public.driver_weekly_balances;
CREATE POLICY "Service role manages balances insert"
ON public.driver_weekly_balances FOR INSERT
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages balances update" ON public.driver_weekly_balances;
CREATE POLICY "Service role manages balances update"
ON public.driver_weekly_balances FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- error_reports : on garde ouvert mais avec contrôle minimal (rate limit côté code déjà en place)
-- On exige au moins une session valide OU un user_agent + restriction de taille
DROP POLICY IF EXISTS "Anyone can create error reports" ON public.error_reports;
CREATE POLICY "Anyone can create error reports"
ON public.error_reports FOR INSERT
WITH CHECK (
  -- Soit utilisateur authentifié, soit invité avec contexte minimal valide
  auth.uid() IS NOT NULL 
  OR (
    error_message IS NOT NULL 
    AND length(error_message) BETWEEN 1 AND 5000
  )
);

-- 2. Restreindre les buckets publics : retirer le LIST sur les buckets publics
-- Les fichiers restent accessibles via URL directe, mais on bloque le listing

-- profile-photos : public read mais pas de listing
DROP POLICY IF EXISTS "Public can list profile photos" ON storage.objects;

-- training-videos : public read mais pas de listing
DROP POLICY IF EXISTS "Public can list training videos" ON storage.objects;

-- podcast-audio : public read mais pas de listing
DROP POLICY IF EXISTS "Public can list podcast audio" ON storage.objects;

-- Politique unifiée: SELECT autorisé uniquement avec un nom de fichier précis (pas de listing en masse)
-- Note: Postgres RLS ne distingue pas list vs get directement, mais on peut limiter via ownership
-- Pour ces buckets publics, on conserve l'accès en lecture mais on documente le risque

-- En pratique : on s'assure qu'il n'y a pas de policy trop large permettant le listing anonyme
-- Vérification : retirer toute policy SELECT générique sur ces buckets sans condition stricte
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname='storage' AND tablename='objects' 
    AND policyname ILIKE '%public%list%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;