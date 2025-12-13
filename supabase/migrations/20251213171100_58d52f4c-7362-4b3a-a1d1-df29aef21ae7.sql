-- Ajouter les champs pour les clients non-inscrits dans la table courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS is_guest_booking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS guest_tracking_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS guest_estimated_price NUMERIC,
ADD COLUMN IF NOT EXISTS guest_notified_at TIMESTAMP WITH TIME ZONE;

-- Index pour rechercher les réservations par token
CREATE INDEX IF NOT EXISTS idx_courses_guest_tracking_token ON public.courses(guest_tracking_token) WHERE is_guest_booking = true;

-- Index pour les réservations clients non-inscrits par chauffeur
CREATE INDEX IF NOT EXISTS idx_courses_guest_by_driver ON public.courses(driver_id) WHERE is_guest_booking = true;

-- Politique RLS pour permettre aux visiteurs de créer des réservations guest
CREATE POLICY "Allow guest bookings creation"
ON public.courses
FOR INSERT
TO anon
WITH CHECK (is_guest_booking = true AND guest_email IS NOT NULL AND guest_phone IS NOT NULL);

-- Politique RLS pour permettre aux visiteurs de consulter leur réservation via token
CREATE POLICY "Allow guests to view their booking by token"
ON public.courses
FOR SELECT
TO anon
USING (is_guest_booking = true AND guest_tracking_token IS NOT NULL);

-- Fonction pour récupérer une réservation par token
CREATE OR REPLACE FUNCTION public.get_guest_booking_by_token(_token UUID)
RETURNS TABLE(
  id UUID,
  pickup_address TEXT,
  destination_address TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  status course_status,
  guest_name TEXT,
  guest_estimated_price NUMERIC,
  driver_name TEXT,
  driver_company TEXT,
  driver_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.pickup_address,
    c.destination_address,
    c.scheduled_date,
    c.status,
    c.guest_name,
    c.guest_estimated_price,
    p.full_name AS driver_name,
    d.company_name AS driver_company,
    CASE WHEN d.show_phone THEN p.phone ELSE NULL END AS driver_phone,
    c.created_at
  FROM courses c
  JOIN drivers d ON c.driver_id = d.id
  JOIN profiles p ON d.user_id = p.id
  WHERE c.guest_tracking_token = _token
    AND c.is_guest_booking = true;
END;
$$;