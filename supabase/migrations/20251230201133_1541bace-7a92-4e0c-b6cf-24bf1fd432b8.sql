-- Modifier la fonction pour définir la deadline des documents à 30 jours
CREATE OR REPLACE FUNCTION public.set_fleet_manager_documents_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Définir la deadline à 30 jours après l'inscription
  NEW.documents_deadline := NEW.created_at + INTERVAL '30 days';
  RETURN NEW;
END;
$$;