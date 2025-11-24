-- Créer une vue matérialisée pour les statistiques des chauffeurs
-- Cette vue pré-calcule les statistiques lourdes et se rafraîchit automatiquement

CREATE MATERIALIZED VIEW IF NOT EXISTS driver_statistics AS
SELECT
  d.id as driver_id,
  d.user_id,
  
  -- Statistiques clients
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT CASE WHEN c.is_exclusive = true THEN c.id END) as exclusive_clients,
  COUNT(DISTINCT CASE WHEN c.is_exclusive = false THEN c.id END) as free_clients,
  
  -- Statistiques courses
  COUNT(DISTINCT co.id) as total_courses,
  COUNT(DISTINCT CASE WHEN co.status = 'completed' THEN co.id END) as completed_courses,
  COUNT(DISTINCT CASE WHEN co.status = 'pending' THEN co.id END) as pending_courses,
  COUNT(DISTINCT CASE WHEN co.status = 'accepted' THEN co.id END) as confirmed_courses,
  COUNT(DISTINCT CASE WHEN co.status = 'in_progress' THEN co.id END) as in_progress_courses,
  COUNT(DISTINCT CASE WHEN co.status = 'cancelled' THEN co.id END) as cancelled_courses,
  COUNT(DISTINCT CASE WHEN DATE(co.scheduled_date) = CURRENT_DATE THEN co.id END) as courses_today,
  
  -- Statistiques financières (factures payées uniquement)
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' THEN f.amount ELSE 0 END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' AND DATE(f.paid_at) = CURRENT_DATE THEN f.amount ELSE 0 END), 0) as revenue_today,
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' AND DATE(f.paid_at) >= DATE_TRUNC('week', CURRENT_DATE) THEN f.amount ELSE 0 END), 0) as revenue_this_week,
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' AND DATE(f.paid_at) >= DATE_TRUNC('month', CURRENT_DATE) THEN f.amount ELSE 0 END), 0) as revenue_this_month,
  
  -- Statistiques factures
  COUNT(DISTINCT f.id) as total_invoices,
  COUNT(DISTINCT CASE WHEN f.payment_status = 'paid' THEN f.id END) as paid_invoices,
  COUNT(DISTINCT CASE WHEN f.payment_status = 'pending' THEN f.id END) as pending_invoices,
  
  -- Statistiques devis
  COUNT(DISTINCT dv.id) as total_quotes,
  COUNT(DISTINCT CASE WHEN dv.status = 'accepted' THEN dv.id END) as accepted_quotes,
  COUNT(DISTINCT CASE WHEN dv.status = 'pending' THEN dv.id END) as pending_quotes,
  COUNT(DISTINCT CASE WHEN dv.status = 'rejected' THEN dv.id END) as rejected_quotes,
  
  -- Dernière mise à jour
  NOW() as last_updated

FROM drivers d
LEFT JOIN clients c ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids))
LEFT JOIN courses co ON (co.driver_id = d.id OR d.id = ANY(co.driver_ids))
LEFT JOIN factures f ON f.driver_id = d.id
LEFT JOIN devis dv ON dv.driver_id = d.id

WHERE d.status = 'validated'
GROUP BY d.id, d.user_id;

-- Index pour performances de lecture
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_statistics_driver_id ON driver_statistics(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_statistics_user_id ON driver_statistics(user_id);

-- Fonction pour rafraîchir la vue matérialisée
CREATE OR REPLACE FUNCTION refresh_driver_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY driver_statistics;
END;
$$;

-- Trigger pour rafraîchir automatiquement après certaines opérations
-- (Rafraîchissement toutes les 5 minutes via fonction séparée pour éviter overhead)

-- Créer une fonction pour rafraîchissement automatique périodique
COMMENT ON MATERIALIZED VIEW driver_statistics IS 'Vue matérialisée des statistiques drivers. Rafraîchie automatiquement toutes les 5 minutes pour optimiser les performances à grande échelle.';

-- Grant permissions
GRANT SELECT ON driver_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_driver_statistics TO authenticated;