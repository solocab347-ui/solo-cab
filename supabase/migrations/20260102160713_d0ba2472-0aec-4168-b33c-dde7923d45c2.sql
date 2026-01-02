-- Supprimer la contrainte unique globale sur invoice_number_generated (doit être par chauffeur)
ALTER TABLE factures DROP CONSTRAINT IF EXISTS factures_invoice_number_generated_key;