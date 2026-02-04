-- 1. Activer l'extension PostGIS pour les calculs géospatiaux
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Ajouter colonnes de localisation aux chauffeurs
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_available_now BOOLEAN DEFAULT false;

-- 3. Créer index spatial pour performance des requêtes de proximité
CREATE INDEX IF NOT EXISTS idx_drivers_location 
ON drivers (current_latitude, current_longitude) 
WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

-- 4. Table des demandes de courses immédiates
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  pickup_address TEXT NOT NULL,
  pickup_latitude DECIMAL(10, 8),
  pickup_longitude DECIMAL(11, 8),
  destination_address TEXT NOT NULL,
  destination_latitude DECIMAL(10, 8),
  destination_longitude DECIMAL(11, 8),
  distance_km DECIMAL(10, 2),
  ride_type TEXT DEFAULT 'immediate' CHECK (ride_type IN ('immediate', 'scheduled')),
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'pending', 'accepted', 'cancelled', 'expired', 'no_driver')),
  search_radius_km INTEGER DEFAULT 5,
  selected_driver_id UUID REFERENCES drivers(id),
  accepted_by_driver_id UUID REFERENCES drivers(id),
  estimated_price DECIMAL(10, 2),
  final_course_id UUID REFERENCES courses(id),
  timeout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_driver ON ride_requests(selected_driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_created ON ride_requests(created_at DESC);

-- 6. RLS pour ride_requests
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Politique: clients voient leurs demandes
CREATE POLICY "Clients can view their own ride requests"
ON ride_requests FOR SELECT
USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  OR guest_phone IS NOT NULL
);

-- Politique: clients peuvent créer des demandes
CREATE POLICY "Clients can create ride requests"
ON ride_requests FOR INSERT
WITH CHECK (true);

-- Politique: chauffeurs sélectionnés peuvent voir la demande
CREATE POLICY "Selected drivers can view ride requests"
ON ride_requests FOR SELECT
USING (
  selected_driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Politique: chauffeurs peuvent accepter (update)
CREATE POLICY "Drivers can accept ride requests"
ON ride_requests FOR UPDATE
USING (
  selected_driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- 7. Fonction RPC pour trouver les chauffeurs proches avec élargissement progressif
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  driver_id UUID,
  company_name TEXT,
  display_name TEXT,
  profile_photo_url TEXT,
  base_fare DECIMAL,
  per_km_rate DECIMAL,
  minimum_price DECIMAL,
  distance_meters DOUBLE PRECISION,
  search_radius_used INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_radius INTEGER;
  v_found_count INTEGER;
BEGIN
  -- Essayer d'abord 5 km
  v_search_radius := 5000;
  
  SELECT COUNT(*) INTO v_found_count
  FROM drivers d
  WHERE d.is_available_now = true
    AND d.current_latitude IS NOT NULL
    AND d.current_longitude IS NOT NULL
    AND d.last_location_update > NOW() - INTERVAL '10 minutes'
    AND d.public_profile_enabled = true
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      v_search_radius
    );
  
  -- Si pas assez, élargir à 10 km
  IF v_found_count = 0 THEN
    v_search_radius := 10000;
    
    SELECT COUNT(*) INTO v_found_count
    FROM drivers d
    WHERE d.is_available_now = true
      AND d.current_latitude IS NOT NULL
      AND d.current_longitude IS NOT NULL
      AND d.last_location_update > NOW() - INTERVAL '10 minutes'
      AND d.public_profile_enabled = true
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        v_search_radius
      );
  END IF;
  
  -- Si toujours pas assez, élargir à 20 km
  IF v_found_count = 0 THEN
    v_search_radius := 20000;
  END IF;
  
  -- Retourner les résultats
  RETURN QUERY
  SELECT 
    d.id as driver_id,
    d.company_name,
    COALESCE(p.full_name, d.company_name) as display_name,
    p.profile_photo_url,
    COALESCE(d.base_fare, 0) as base_fare,
    COALESCE(d.per_km_rate, 0) as per_km_rate,
    COALESCE(d.minimum_price, 0) as minimum_price,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) as distance_meters,
    v_search_radius / 1000 as search_radius_used
  FROM drivers d
  LEFT JOIN profiles p ON d.user_id = p.id
  WHERE d.is_available_now = true
    AND d.current_latitude IS NOT NULL
    AND d.current_longitude IS NOT NULL
    AND d.last_location_update > NOW() - INTERVAL '10 minutes'
    AND d.public_profile_enabled = true
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      v_search_radius
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;

-- 8. Fonction RPC pour accepter une demande de course (atomique)
CREATE OR REPLACE FUNCTION accept_ride_request(
  p_request_id UUID,
  p_driver_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request ride_requests%ROWTYPE;
  v_result JSON;
BEGIN
  -- Verrouillage pessimiste pour éviter les race conditions
  SELECT * INTO v_request
  FROM ride_requests
  WHERE id = p_request_id
  FOR UPDATE NOWAIT;
  
  -- Vérifier que la demande existe
  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Demande non trouvée');
  END IF;
  
  -- Vérifier que c'est bien le chauffeur sélectionné
  IF v_request.selected_driver_id != p_driver_id THEN
    RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas le chauffeur sélectionné');
  END IF;
  
  -- Vérifier que la demande est encore en attente
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Cette demande n''est plus disponible');
  END IF;
  
  -- Vérifier le timeout
  IF v_request.timeout_at < NOW() THEN
    UPDATE ride_requests SET status = 'expired' WHERE id = p_request_id;
    RETURN json_build_object('success', false, 'error', 'Délai de réponse dépassé');
  END IF;
  
  -- Accepter la demande
  UPDATE ride_requests
  SET 
    status = 'accepted',
    accepted_by_driver_id = p_driver_id,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object('success', true, 'message', 'Course acceptée');
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'error', 'Demande en cours de traitement');
END;
$$;

-- 9. Activer Realtime pour ride_requests
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;