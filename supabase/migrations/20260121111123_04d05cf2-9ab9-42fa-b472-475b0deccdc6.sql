-- Modifier la fonction pour les chauffeurs: 7 jours au lieu de 30
CREATE OR REPLACE FUNCTION set_driver_documents_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement pour les chauffeurs indépendants (pas de fleet_manager_id)
  IF NEW.fleet_manager_id IS NULL THEN
    NEW.documents_deadline := NEW.created_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Modifier la fonction pour les fleet managers: 7 jours au lieu de 30
CREATE OR REPLACE FUNCTION set_fleet_manager_documents_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Définir la deadline à 7 jours après l'inscription
  NEW.documents_deadline := NEW.created_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Ajouter une colonne pour marquer les comptes bloqués pour documents expirés
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_access_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_access_blocked_at TIMESTAMPTZ;
ALTER TABLE fleet_managers ADD COLUMN IF NOT EXISTS documents_access_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE fleet_managers ADD COLUMN IF NOT EXISTS documents_access_blocked_at TIMESTAMPTZ;

-- Fonction pour bloquer l'accès quand les documents sont expirés
CREATE OR REPLACE FUNCTION check_and_block_expired_documents()
RETURNS void AS $$
BEGIN
  -- Bloquer les chauffeurs avec deadline expirée
  UPDATE drivers 
  SET 
    documents_access_blocked = TRUE,
    documents_access_blocked_at = NOW()
  WHERE 
    documents_deadline < NOW()
    AND documents_status NOT IN ('submitted', 'validated')
    AND documents_access_blocked = FALSE;
    
  -- Bloquer les fleet managers avec deadline expirée  
  UPDATE fleet_managers 
  SET 
    documents_access_blocked = TRUE,
    documents_access_blocked_at = NOW()
  WHERE 
    documents_deadline < NOW()
    AND documents_status NOT IN ('submitted', 'validated')
    AND documents_access_blocked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour débloquer quand les documents sont soumis
CREATE OR REPLACE FUNCTION unblock_on_document_submit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.documents_status IN ('submitted', 'validated') AND OLD.documents_status NOT IN ('submitted', 'validated') THEN
    NEW.documents_access_blocked := FALSE;
    NEW.documents_access_blocked_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Créer le trigger pour débloquer automatiquement les chauffeurs
DROP TRIGGER IF EXISTS unblock_driver_on_document_submit ON drivers;
CREATE TRIGGER unblock_driver_on_document_submit
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION unblock_on_document_submit();

-- Créer le trigger pour débloquer automatiquement les fleet managers
DROP TRIGGER IF EXISTS unblock_fleet_manager_on_document_submit ON fleet_managers;
CREATE TRIGGER unblock_fleet_manager_on_document_submit
  BEFORE UPDATE ON fleet_managers
  FOR EACH ROW
  EXECUTE FUNCTION unblock_on_document_submit();