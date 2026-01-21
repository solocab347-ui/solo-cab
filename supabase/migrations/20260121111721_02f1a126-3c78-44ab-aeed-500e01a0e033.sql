-- Mettre à jour le délai des documents de 7 jours à 14 jours pour les chauffeurs
CREATE OR REPLACE FUNCTION public.set_driver_documents_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Définir la date limite à 14 jours après l'inscription
  NEW.documents_deadline := NEW.created_at + INTERVAL '14 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Mettre à jour le délai des documents de 7 jours à 14 jours pour les fleet managers
CREATE OR REPLACE FUNCTION public.set_fleet_manager_documents_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Définir la date limite à 14 jours après l'inscription
  NEW.documents_deadline := NEW.created_at + INTERVAL '14 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;