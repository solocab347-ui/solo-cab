-- Créer la table driver_vehicles pour la gestion multi-véhicules
CREATE TABLE public.driver_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  plate TEXT,
  year INTEGER,
  category TEXT NOT NULL DEFAULT 'berline', -- berline, van, luxe, electrique, break
  max_passengers INTEGER DEFAULT 4,
  is_favorite BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Photos
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Équipements spécifiques au véhicule
  equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Tarification différenciée (optionnel, sinon utilise les tarifs par défaut du chauffeur)
  custom_base_fare NUMERIC,
  custom_per_km_rate NUMERIC,
  custom_hourly_rate NUMERIC,
  custom_minimum_price NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_driver_vehicles_driver_id ON public.driver_vehicles(driver_id);
CREATE INDEX idx_driver_vehicles_is_favorite ON public.driver_vehicles(driver_id, is_favorite) WHERE is_favorite = true;

-- Contrainte unique pour avoir un seul véhicule favori par chauffeur
CREATE UNIQUE INDEX idx_driver_vehicles_unique_favorite 
ON public.driver_vehicles(driver_id) 
WHERE is_favorite = true AND is_active = true;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_driver_vehicles_updated_at
  BEFORE UPDATE ON public.driver_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Drivers can view their own vehicles"
  ON public.driver_vehicles
  FOR SELECT
  USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can create their own vehicles"
  ON public.driver_vehicles
  FOR INSERT
  WITH CHECK (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can update their own vehicles"
  ON public.driver_vehicles
  FOR UPDATE
  USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can delete their own vehicles"
  ON public.driver_vehicles
  FOR DELETE
  USING (driver_id = get_driver_id(auth.uid()));

-- Admins peuvent tout gérer
CREATE POLICY "Admins can manage all vehicles"
  ON public.driver_vehicles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fleet managers peuvent voir les véhicules de leurs chauffeurs
CREATE POLICY "Fleet managers can view their drivers vehicles"
  ON public.driver_vehicles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fleet_manager_drivers fmd
      WHERE fmd.driver_id = driver_vehicles.driver_id
      AND fmd.fleet_manager_id IN (
        SELECT id FROM fleet_managers WHERE user_id = auth.uid()
      )
    )
  );

-- Vue publique des véhicules pour les profils publics
CREATE POLICY "Public can view vehicles of public profile drivers"
  ON public.driver_vehicles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_vehicles.driver_id
      AND d.public_profile_enabled = true
      AND d.status = 'validated'
    )
    AND is_active = true
  );

-- Fonction pour définir un véhicule comme favori (désactive l'ancien favori)
CREATE OR REPLACE FUNCTION public.set_favorite_vehicle(
  _vehicle_id UUID,
  _driver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le véhicule appartient bien au chauffeur
  IF NOT EXISTS (
    SELECT 1 FROM driver_vehicles 
    WHERE id = _vehicle_id AND driver_id = _driver_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Désactiver l'ancien favori
  UPDATE driver_vehicles 
  SET is_favorite = false, updated_at = now()
  WHERE driver_id = _driver_id AND is_favorite = true;
  
  -- Activer le nouveau favori
  UPDATE driver_vehicles 
  SET is_favorite = true, updated_at = now()
  WHERE id = _vehicle_id;
  
  RETURN true;
END;
$$;