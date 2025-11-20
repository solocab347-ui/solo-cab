-- Ajouter les champs pour équipements, services et informations véhicule détaillées
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS vehicle_equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS vehicle_brand TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;

COMMENT ON COLUMN public.drivers.vehicle_equipment IS 'Liste des équipements disponibles dans le véhicule';
COMMENT ON COLUMN public.drivers.services_offered IS 'Liste des services proposés par le chauffeur';
COMMENT ON COLUMN public.drivers.vehicle_brand IS 'Marque du véhicule';
COMMENT ON COLUMN public.drivers.vehicle_year IS 'Année du véhicule';