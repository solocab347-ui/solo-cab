
-- Table de messages pour le chat en course
CREATE TABLE public.ride_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'driver', 'guest')),
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes par ride_id
CREATE INDEX idx_ride_messages_ride_id ON public.ride_messages(ride_id);
CREATE INDEX idx_ride_messages_created ON public.ride_messages(ride_id, created_at);

-- Enable RLS
ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier l'accès au chat
CREATE OR REPLACE FUNCTION public.can_access_ride_chat(p_ride_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Le chauffeur assigné
    SELECT 1 FROM ride_requests
    WHERE id = p_ride_id
    AND (
      selected_driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
      OR accepted_by_driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  )
  OR EXISTS (
    -- Le client propriétaire
    SELECT 1 FROM ride_requests rr
    JOIN clients c ON c.id = rr.client_id
    WHERE rr.id = p_ride_id AND c.user_id = auth.uid()
  );
$$;

-- Policy: les participants peuvent lire les messages de leur course
CREATE POLICY "Participants can read ride messages"
ON public.ride_messages FOR SELECT
TO authenticated
USING (public.can_access_ride_chat(ride_id));

-- Policy: les participants peuvent envoyer des messages
CREATE POLICY "Participants can send ride messages"
ON public.ride_messages FOR INSERT
TO authenticated
WITH CHECK (public.can_access_ride_chat(ride_id));

-- Policy: guest access via anon (pour les clients non inscrits)
CREATE POLICY "Guests can read their ride messages"
ON public.ride_messages FOR SELECT
TO anon
USING (
  sender_type = 'guest'
  OR EXISTS (
    SELECT 1 FROM ride_requests WHERE id = ride_id AND status IN ('pending', 'accepted', 'in_progress', 'driver_arrived')
  )
);

CREATE POLICY "Guests can send ride messages"
ON public.ride_messages FOR INSERT
TO anon
WITH CHECK (sender_type = 'guest');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
