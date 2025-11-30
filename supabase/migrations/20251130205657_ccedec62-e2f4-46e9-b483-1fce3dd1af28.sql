
-- CORRECTION CRITIQUE: La contrainte UNIQUE sur quote_number doit être par driver
-- Actuellement, les numéros sont partagés entre tous les drivers (BUG)
-- Chaque driver doit avoir sa propre séquence de numéros RES-001, RES-002, etc.

-- 1. Supprimer l'ancienne contrainte globale
ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_quote_number_key;

-- 2. Créer une nouvelle contrainte UNIQUE sur (driver_id, quote_number)
ALTER TABLE devis ADD CONSTRAINT devis_driver_quote_number_key UNIQUE (driver_id, quote_number);

-- Note: Cela permet à chaque driver d'avoir RES-001, RES-002, etc. indépendamment
-- Driver A peut avoir RES-001, RES-002
-- Driver B peut aussi avoir RES-001, RES-002
-- C'est la conception correcte pour l'isolation des données par driver
