-- Suppression temporaire de la contrainte unique sur quote_number
ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_driver_quote_number_key;

-- Suppression de la contrainte similaire sur les factures si elle existe
ALTER TABLE factures DROP CONSTRAINT IF EXISTS factures_driver_invoice_number_key;