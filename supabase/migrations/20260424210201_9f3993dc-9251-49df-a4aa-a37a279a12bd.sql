
DROP POLICY IF EXISTS "Service manages queue" ON public.push_pending_queue;
-- Le service_role contourne RLS par défaut côté Supabase. Une policy permissive n'est pas requise.
-- On garde uniquement la lecture pour les utilisateurs et admins.
