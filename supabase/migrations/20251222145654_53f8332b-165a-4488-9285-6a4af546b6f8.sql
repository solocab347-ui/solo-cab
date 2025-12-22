-- Table pour la tarification par ville (chauffeurs et gestionnaires)
CREATE TABLE public.city_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  fleet_manager_id UUID REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  sectors TEXT[] DEFAULT ARRAY[]::TEXT[], -- Secteurs spécifiques (ex: Rive Gauche, Rive Droite pour Paris)
  pricing_type TEXT NOT NULL DEFAULT 'per_km', -- 'per_km' ou 'hourly'
  base_fare NUMERIC DEFAULT 0,
  per_km_rate NUMERIC DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  minimum_price NUMERIC DEFAULT 0,
  tva_rate NUMERIC DEFAULT 10,
  tva_included BOOLEAN DEFAULT false,
  evening_surcharge NUMERIC DEFAULT 0, -- Pourcentage
  weekend_surcharge NUMERIC DEFAULT 0, -- Pourcentage
  -- Heures de pointe (optionnel)
  peak_hours_enabled BOOLEAN DEFAULT false,
  peak_hours_start TIME,
  peak_hours_end TIME,
  peak_hours_multiplier NUMERIC DEFAULT 1.0, -- Multiplicateur (ex: 1.5 = +50%)
  -- Heures creuses (optionnel)
  off_peak_enabled BOOLEAN DEFAULT false,
  off_peak_start TIME,
  off_peak_end TIME,
  off_peak_discount NUMERIC DEFAULT 0, -- Pourcentage de réduction
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Pour ordonner si plusieurs configs pour même ville
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un seul propriétaire (driver OU fleet_manager)
  CONSTRAINT city_pricing_owner_check CHECK (
    (driver_id IS NOT NULL AND fleet_manager_id IS NULL) OR
    (driver_id IS NULL AND fleet_manager_id IS NOT NULL)
  )
);

-- Index pour les recherches
CREATE INDEX idx_city_pricing_driver ON public.city_pricing(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_city_pricing_fleet ON public.city_pricing(fleet_manager_id) WHERE fleet_manager_id IS NOT NULL;
CREATE INDEX idx_city_pricing_city ON public.city_pricing(city_name);
CREATE INDEX idx_city_pricing_active ON public.city_pricing(is_active);

-- Table pour les secteurs prédéfinis des grandes villes
CREATE TABLE public.city_sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  sector_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city_name, sector_name)
);

-- Insérer les secteurs pour Paris
INSERT INTO public.city_sectors (city_name, sector_name, display_order) VALUES
  ('Paris', 'Rive Gauche', 1),
  ('Paris', 'Rive Droite', 2),
  ('Paris', '1er arrondissement', 3),
  ('Paris', '2ème arrondissement', 4),
  ('Paris', '3ème arrondissement', 5),
  ('Paris', '4ème arrondissement', 6),
  ('Paris', '5ème arrondissement', 7),
  ('Paris', '6ème arrondissement', 8),
  ('Paris', '7ème arrondissement', 9),
  ('Paris', '8ème arrondissement', 10),
  ('Paris', '9ème arrondissement', 11),
  ('Paris', '10ème arrondissement', 12),
  ('Paris', '11ème arrondissement', 13),
  ('Paris', '12ème arrondissement', 14),
  ('Paris', '13ème arrondissement', 15),
  ('Paris', '14ème arrondissement', 16),
  ('Paris', '15ème arrondissement', 17),
  ('Paris', '16ème arrondissement', 18),
  ('Paris', '17ème arrondissement', 19),
  ('Paris', '18ème arrondissement', 20),
  ('Paris', '19ème arrondissement', 21),
  ('Paris', '20ème arrondissement', 22);

-- Secteurs pour Lyon
INSERT INTO public.city_sectors (city_name, sector_name, display_order) VALUES
  ('Lyon', 'Presqu''île', 1),
  ('Lyon', 'Vieux Lyon', 2),
  ('Lyon', 'Part-Dieu', 3),
  ('Lyon', 'Confluence', 4),
  ('Lyon', 'Croix-Rousse', 5),
  ('Lyon', 'Villeurbanne', 6);

-- Secteurs pour Marseille
INSERT INTO public.city_sectors (city_name, sector_name, display_order) VALUES
  ('Marseille', 'Vieux-Port', 1),
  ('Marseille', 'Joliette', 2),
  ('Marseille', 'Prado', 3),
  ('Marseille', 'Centre-ville', 4),
  ('Marseille', 'Nord', 5),
  ('Marseille', 'Sud', 6);

-- Secteurs pour Nice
INSERT INTO public.city_sectors (city_name, sector_name, display_order) VALUES
  ('Nice', 'Vieux Nice', 1),
  ('Nice', 'Promenade des Anglais', 2),
  ('Nice', 'Centre-ville', 3),
  ('Nice', 'Cimiez', 4);

-- Secteurs pour Bordeaux
INSERT INTO public.city_sectors (city_name, sector_name, display_order) VALUES
  ('Bordeaux', 'Centre historique', 1),
  ('Bordeaux', 'Chartrons', 2),
  ('Bordeaux', 'Gare Saint-Jean', 3),
  ('Bordeaux', 'Rive Droite', 4);

-- Secteurs pour Lille
INSERT INTO public.city_sectors (city_name, sector_name, display_order) VALUES
  ('Lille', 'Vieux Lille', 1),
  ('Lille', 'Centre', 2),
  ('Lille', 'Euralille', 3),
  ('Lille', 'Wazemmes', 4);

-- Activer RLS
ALTER TABLE public.city_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_sectors ENABLE ROW LEVEL SECURITY;

-- Policies pour city_pricing
CREATE POLICY "Drivers can manage their city pricing"
  ON public.city_pricing
  FOR ALL
  USING (driver_id = get_driver_id(auth.uid()))
  WITH CHECK (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Fleet managers can manage their city pricing"
  ON public.city_pricing
  FOR ALL
  USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()))
  WITH CHECK (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all city pricing"
  ON public.city_pricing
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policies pour city_sectors (lecture publique)
CREATE POLICY "Anyone can view city sectors"
  ON public.city_sectors
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage city sectors"
  ON public.city_sectors
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fonction pour obtenir la tarification ville applicable
CREATE OR REPLACE FUNCTION public.get_city_pricing(
  p_driver_id UUID DEFAULT NULL,
  p_fleet_manager_id UUID DEFAULT NULL,
  p_city_name TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  city_name TEXT,
  sectors TEXT[],
  pricing_type TEXT,
  base_fare NUMERIC,
  per_km_rate NUMERIC,
  hourly_rate NUMERIC,
  minimum_price NUMERIC,
  tva_rate NUMERIC,
  tva_included BOOLEAN,
  evening_surcharge NUMERIC,
  weekend_surcharge NUMERIC,
  peak_hours_enabled BOOLEAN,
  peak_hours_start TIME,
  peak_hours_end TIME,
  peak_hours_multiplier NUMERIC,
  off_peak_enabled BOOLEAN,
  off_peak_start TIME,
  off_peak_end TIME,
  off_peak_discount NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.city_name,
    cp.sectors,
    cp.pricing_type,
    cp.base_fare,
    cp.per_km_rate,
    cp.hourly_rate,
    cp.minimum_price,
    cp.tva_rate,
    cp.tva_included,
    cp.evening_surcharge,
    cp.weekend_surcharge,
    cp.peak_hours_enabled,
    cp.peak_hours_start,
    cp.peak_hours_end,
    cp.peak_hours_multiplier,
    cp.off_peak_enabled,
    cp.off_peak_start,
    cp.off_peak_end,
    cp.off_peak_discount
  FROM city_pricing cp
  WHERE 
    cp.is_active = true
    AND (
      (p_driver_id IS NOT NULL AND cp.driver_id = p_driver_id) OR
      (p_fleet_manager_id IS NOT NULL AND cp.fleet_manager_id = p_fleet_manager_id)
    )
    AND (p_city_name IS NULL OR cp.city_name = p_city_name)
    AND (
      p_sector IS NULL 
      OR array_length(cp.sectors, 1) IS NULL 
      OR array_length(cp.sectors, 1) = 0
      OR p_sector = ANY(cp.sectors)
    )
  ORDER BY cp.priority DESC, array_length(cp.sectors, 1) DESC NULLS LAST
  LIMIT 1;
END;
$$;

-- Fonction pour calculer le prix avec tarification ville
CREATE OR REPLACE FUNCTION public.calculate_city_course_price(
  p_city_pricing_id UUID,
  p_distance_km NUMERIC,
  p_duration_minutes INTEGER,
  p_scheduled_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  base_price NUMERIC,
  distance_price NUMERIC,
  time_price NUMERIC,
  subtotal NUMERIC,
  tva_amount NUMERIC,
  total_price NUMERIC,
  surcharge_evening NUMERIC,
  surcharge_weekend NUMERIC,
  peak_adjustment NUMERIC,
  off_peak_discount NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
  v_pricing RECORD;
  v_base_price NUMERIC := 0;
  v_distance_price NUMERIC := 0;
  v_time_price NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_tva NUMERIC := 0;
  v_evening_amount NUMERIC := 0;
  v_weekend_amount NUMERIC := 0;
  v_peak_amount NUMERIC := 0;
  v_off_peak_amount NUMERIC := 0;
  v_is_evening BOOLEAN := false;
  v_is_weekend BOOLEAN := false;
  v_is_peak BOOLEAN := false;
  v_is_off_peak BOOLEAN := false;
  v_hour INTEGER;
  v_time TIME;
  v_day_of_week INTEGER;
BEGIN
  -- Récupérer la tarification
  SELECT * INTO v_pricing FROM city_pricing cp WHERE cp.id = p_city_pricing_id;
  
  IF v_pricing IS NULL THEN
    RAISE EXCEPTION 'City pricing not found';
  END IF;
  
  -- Déterminer l'heure et le jour
  IF p_scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_time := (p_scheduled_date AT TIME ZONE 'Europe/Paris')::TIME;
    v_day_of_week := EXTRACT(DOW FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
    
    -- Heures de pointe
    IF v_pricing.peak_hours_enabled AND v_pricing.peak_hours_start IS NOT NULL AND v_pricing.peak_hours_end IS NOT NULL THEN
      IF v_pricing.peak_hours_start < v_pricing.peak_hours_end THEN
        v_is_peak := v_time >= v_pricing.peak_hours_start AND v_time <= v_pricing.peak_hours_end;
      ELSE
        v_is_peak := v_time >= v_pricing.peak_hours_start OR v_time <= v_pricing.peak_hours_end;
      END IF;
    END IF;
    
    -- Heures creuses
    IF v_pricing.off_peak_enabled AND v_pricing.off_peak_start IS NOT NULL AND v_pricing.off_peak_end IS NOT NULL THEN
      IF v_pricing.off_peak_start < v_pricing.off_peak_end THEN
        v_is_off_peak := v_time >= v_pricing.off_peak_start AND v_time <= v_pricing.off_peak_end;
      ELSE
        v_is_off_peak := v_time >= v_pricing.off_peak_start OR v_time <= v_pricing.off_peak_end;
      END IF;
    END IF;
  END IF;
  
  -- Calcul selon le type
  IF v_pricing.pricing_type = 'hourly' THEN
    v_base_price := 0;
    v_distance_price := 0;
    v_time_price := v_pricing.hourly_rate * (p_duration_minutes / 60.0);
  ELSE
    v_base_price := v_pricing.base_fare;
    v_distance_price := v_pricing.per_km_rate * p_distance_km;
    v_time_price := 0;
  END IF;
  
  v_subtotal := v_base_price + v_distance_price + v_time_price;
  
  -- Appliquer le prix minimum
  IF v_pricing.minimum_price > 0 AND v_subtotal < v_pricing.minimum_price THEN
    v_distance_price := v_pricing.minimum_price - v_base_price;
    IF v_distance_price < 0 THEN
      v_distance_price := 0;
      v_base_price := v_pricing.minimum_price;
    END IF;
    v_subtotal := v_pricing.minimum_price;
  END IF;
  
  -- Majorations heures de pointe (avant autres majorations)
  IF v_is_peak AND v_pricing.peak_hours_multiplier > 1.0 THEN
    v_peak_amount := v_subtotal * (v_pricing.peak_hours_multiplier - 1.0);
    v_subtotal := v_subtotal + v_peak_amount;
  END IF;
  
  -- Réduction heures creuses (si pas en heures de pointe)
  IF NOT v_is_peak AND v_is_off_peak AND v_pricing.off_peak_discount > 0 THEN
    v_off_peak_amount := v_subtotal * (v_pricing.off_peak_discount / 100);
    v_subtotal := v_subtotal - v_off_peak_amount;
  END IF;
  
  -- Majorations soirée/weekend
  IF v_is_evening AND v_pricing.evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_pricing.evening_surcharge / 100);
    v_subtotal := v_subtotal + v_evening_amount;
  END IF;
  
  IF v_is_weekend AND v_pricing.weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_pricing.weekend_surcharge / 100);
    v_subtotal := v_subtotal + v_weekend_amount;
  END IF;
  
  -- TVA
  IF v_pricing.tva_included THEN
    v_tva := v_subtotal - (v_subtotal / (1 + v_pricing.tva_rate / 100));
  ELSE
    v_tva := v_subtotal * (v_pricing.tva_rate / 100);
  END IF;
  
  base_price := v_base_price;
  distance_price := v_distance_price;
  time_price := v_time_price;
  subtotal := v_subtotal;
  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_pricing.tva_included THEN 0 ELSE v_tva END);
  surcharge_evening := v_evening_amount;
  surcharge_weekend := v_weekend_amount;
  peak_adjustment := v_peak_amount;
  off_peak_discount := v_off_peak_amount;
  
  RETURN NEXT;
END;
$$;