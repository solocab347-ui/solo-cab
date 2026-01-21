-- Modifier le trigger pour utiliser 7 jours au lieu de 14 pour les documents
-- Et mettre à jour les deadlines existantes qui n'ont pas encore expiré

-- Mettre à jour la fonction du trigger pour les nouveaux drivers
CREATE OR REPLACE FUNCTION set_documents_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Définir la date limite à 7 jours après l'inscription
  NEW.documents_deadline := NEW.created_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour la fonction du trigger pour les fleet managers
CREATE OR REPLACE FUNCTION set_fleet_manager_documents_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Définir la date limite à 7 jours après l'inscription
  NEW.documents_deadline := NEW.created_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour les deadlines existantes pour les chauffeurs en attente
-- Recalculer à 7 jours depuis leur inscription
UPDATE drivers 
SET documents_deadline = created_at + INTERVAL '7 days'
WHERE documents_status = 'pending' 
  AND documents_deadline IS NOT NULL;