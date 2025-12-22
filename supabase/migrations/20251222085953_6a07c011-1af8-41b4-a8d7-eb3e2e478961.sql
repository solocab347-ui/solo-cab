-- Ajouter colonnes pour les documents des chauffeurs indépendants
-- documents_status: pending, submitted, validated, rejected
-- documents_deadline: date limite (1 mois après inscription)
-- documents_submitted_at: date de soumission

-- Modifier la colonne documents_status pour les chauffeurs indépendants (pas fleet_)
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS documents_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS documents_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS documents_deadline TIMESTAMP WITH TIME ZONE;

-- Ajouter un commentaire pour clarifier
COMMENT ON COLUMN public.drivers.documents_status IS 'Statut des documents pour chauffeurs indépendants: pending, submitted, validated, rejected';
COMMENT ON COLUMN public.drivers.documents_deadline IS 'Deadline pour soumettre les documents (1 mois après inscription)';
COMMENT ON COLUMN public.drivers.documents_submitted_at IS 'Date de soumission de tous les documents';

-- Trigger pour définir automatiquement la deadline à 1 mois après création pour les chauffeurs non-fleet
CREATE OR REPLACE FUNCTION public.set_driver_documents_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Seulement pour les chauffeurs indépendants (pas de fleet_manager_id)
  IF NEW.fleet_manager_id IS NULL THEN
    NEW.documents_deadline := NEW.created_at + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_set_driver_documents_deadline ON public.drivers;
CREATE TRIGGER trigger_set_driver_documents_deadline
  BEFORE INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_driver_documents_deadline();