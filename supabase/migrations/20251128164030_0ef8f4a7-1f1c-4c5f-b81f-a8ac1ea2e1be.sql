-- CORRECTION CRITIQUE: Ajouter politique INSERT pour permettre aux utilisateurs de créer leur profil client

-- Politique permettant aux utilisateurs authentifiés de créer leur propre entrée client
CREATE POLICY "Users can create their own client profile"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Commentaire explicatif
COMMENT ON POLICY "Users can create their own client profile" ON public.clients IS 
'Permet aux utilisateurs authentifiés de créer leur propre entrée client lors de l''inscription via QR code ou vitrine publique';