-- Ajouter un champ pour identifier les comptes de démonstration
ALTER TABLE public.drivers 
ADD COLUMN is_demo_account BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.drivers.is_demo_account IS 'Indique si ce compte est utilisé uniquement pour démonstration. Les données de ces comptes sont exclues des statistiques globales.';

-- Configurer Alexandre Diarra comme compte de démonstration
UPDATE public.drivers
SET 
  is_demo_account = true,
  public_profile_enabled = false
WHERE user_id IN (
  SELECT id FROM public.profiles 
  WHERE email = 'alexandrediarra00@gmail.com'
);