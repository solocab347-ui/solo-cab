
-- ═══════════════════════════════════════════════════════════════
-- P0: Supprimer les index dupliqués (3 doublons exacts)
-- ═══════════════════════════════════════════════════════════════

-- Doublon GIN sur clients.driver_ids
DROP INDEX IF EXISTS idx_clients_driver_ids;
-- Garde: idx_clients_driver_ids_gin

-- Doublon btree sur clients.is_exclusive  
DROP INDEX IF EXISTS idx_clients_exclusive;
-- Garde: idx_clients_is_exclusive

-- Doublon GIN sur courses.driver_ids
DROP INDEX IF EXISTS idx_courses_driver_ids;
-- Garde: idx_courses_driver_ids_gin

-- ═══════════════════════════════════════════════════════════════
-- P0: Optimiser la vue driver_data_isolation
-- Remplacer 5 LEFT JOIN + COUNT DISTINCT par des sous-requêtes scalaires
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.driver_data_isolation
WITH (security_invoker = on) AS
SELECT 
  d.id AS driver_id,
  p.full_name AS driver_name,
  (
    SELECT COUNT(*) FROM clients c 
    WHERE c.driver_id = d.id OR d.id = ANY(COALESCE(c.driver_ids, '{}'))
  ) AS total_clients,
  (
    SELECT COUNT(*) FROM courses co 
    WHERE co.driver_id = d.id OR d.id = ANY(COALESCE(co.driver_ids, '{}'))
  ) AS total_courses,
  (
    SELECT COUNT(*) FROM devis dv 
    WHERE dv.driver_id = d.id
  ) AS total_devis,
  (
    SELECT COUNT(*) FROM factures f 
    WHERE f.driver_id = d.id
  ) AS total_factures
FROM drivers d
LEFT JOIN profiles p ON p.id = d.user_id;
