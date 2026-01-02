-- Recréer les contraintes uniques PAR CHAUFFEUR (pas globales)
-- Cela garantit que chaque chauffeur a des numéros uniques, mais deux chauffeurs peuvent avoir le même numéro

-- Contrainte unique sur quote_number par chauffeur
ALTER TABLE devis ADD CONSTRAINT devis_driver_quote_number_unique UNIQUE (driver_id, quote_number);

-- Contrainte unique sur invoice_number par chauffeur  
ALTER TABLE factures ADD CONSTRAINT factures_driver_invoice_number_unique UNIQUE (driver_id, invoice_number);

-- Contrainte unique sur invoice_number_generated par chauffeur
ALTER TABLE factures ADD CONSTRAINT factures_driver_invoice_number_generated_unique UNIQUE (driver_id, invoice_number_generated);

-- Contrainte unique sur course_number par chauffeur
ALTER TABLE courses ADD CONSTRAINT courses_driver_course_number_unique UNIQUE (driver_id, course_number);