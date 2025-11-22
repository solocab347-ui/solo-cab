-- Correction 1: Recréer la vue driver_data_isolation sans SECURITY DEFINER
DROP VIEW IF EXISTS public.driver_data_isolation;

CREATE VIEW public.driver_data_isolation AS
SELECT 
  d.id AS driver_id,
  p.full_name AS driver_name,
  COUNT(DISTINCT c.id) AS total_clients,
  COUNT(DISTINCT co.id) AS total_courses,
  COUNT(DISTINCT dv.id) AS total_devis,
  COUNT(DISTINCT f.id) AS total_factures
FROM drivers d
LEFT JOIN profiles p ON d.user_id = p.id
LEFT JOIN clients c ON c.driver_id = d.id OR d.id = ANY(c.driver_ids)
LEFT JOIN courses co ON co.driver_id = d.id OR d.id = ANY(co.driver_ids)
LEFT JOIN devis dv ON dv.driver_id = d.id
LEFT JOIN factures f ON f.driver_id = d.id
GROUP BY d.id, p.full_name;

-- Correction 3: Déplacer les extensions vers le schéma extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Déplacer pgcrypto si elle existe dans public
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'pgcrypto' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER EXTENSION pgcrypto SET SCHEMA extensions;
  END IF;
END $$;

-- Déplacer uuid-ossp si elle existe dans public
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'uuid-ossp' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
  END IF;
END $$;