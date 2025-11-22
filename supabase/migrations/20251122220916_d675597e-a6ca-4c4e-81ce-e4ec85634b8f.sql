-- Corriger les politiques RLS pour les notifications
-- Permettre aux utilisateurs de créer des notifications pour d'autres utilisateurs

-- Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;

-- Créer une policy qui permet la création de notifications pour n'importe quel utilisateur
-- Cela est nécessaire pour que les clients puissent notifier les drivers et vice versa
CREATE POLICY "Users can create notifications for any user" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Maintenir la policy de lecture (chaque utilisateur ne voit que ses propres notifications)
-- Cette policy existe déjà donc pas besoin de la recréer

-- Ajouter commentaire pour documentation
COMMENT ON POLICY "Users can create notifications for any user" ON public.notifications IS 
'Permet à n''importe quel utilisateur authentifié de créer des notifications pour d''autres utilisateurs. Nécessaire pour le système de notification inter-utilisateurs (client->driver, driver->client, etc.)';