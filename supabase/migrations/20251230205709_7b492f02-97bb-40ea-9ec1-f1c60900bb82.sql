-- Ajouter les colonnes pour contrôler la visibilité des statistiques du gestionnaire
ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS show_driver_count_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_client_count_public boolean DEFAULT false;

-- Commenter les colonnes
COMMENT ON COLUMN public.fleet_managers.show_driver_count_public IS 'Si true, le nombre de chauffeurs est visible publiquement';
COMMENT ON COLUMN public.fleet_managers.show_client_count_public IS 'Si true, le nombre de clients est visible publiquement';