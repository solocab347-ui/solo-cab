-- Corriger la RLS sur notifications pour permettre les insertions système
-- Les fonctions SECURITY DEFINER tournent avec les droits du propriétaire (postgres)
-- donc elles bypassent la RLS. Mais si la fonction est appelée par un utilisateur,
-- on doit permettre l'insertion pour les notifications destinées à n'importe quel utilisateur

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Only admins and system can create notifications" ON public.notifications;

-- Créer une politique plus flexible qui permet :
-- 1. Les admins peuvent créer des notifications
-- 2. Les fonctions système (via SECURITY DEFINER) peuvent créer des notifications
-- 3. Un utilisateur authentifié peut créer une notification pour un autre utilisateur (cas des workflows)
CREATE POLICY "Allow notification creation"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Pour les utilisateurs anonymes, pas de création
CREATE POLICY "Anon cannot create notifications"
ON public.notifications
FOR INSERT
TO anon
WITH CHECK (false);