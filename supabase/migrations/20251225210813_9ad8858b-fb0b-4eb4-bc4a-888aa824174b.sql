-- Permettre l'accès public aux profils de fleet managers pour l'inscription client
-- Cela permet aux visiteurs de voir les informations de base du gestionnaire même s'il n'a pas activé la vitrine publique

-- Supprimer la politique existante si elle limite trop
DROP POLICY IF EXISTS "Anyone can view public fleet profiles" ON public.fleet_managers;

-- Créer une nouvelle politique qui permet de voir les gestionnaires pour la vitrine ET pour l'inscription
CREATE POLICY "Anyone can view fleet manager basic info"
ON public.fleet_managers FOR SELECT
USING (true);

-- Note: Cette politique permet un accès en lecture seule à tous les profils de gestionnaires
-- Les informations sensibles sont protégées par les colonnes show_* qui contrôlent l'affichage côté frontend