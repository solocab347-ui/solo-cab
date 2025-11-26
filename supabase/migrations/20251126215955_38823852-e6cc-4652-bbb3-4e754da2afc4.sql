-- ================================================================
-- PHASE 1: INDEXATION CRITIQUE POUR SCALABILITÉ 1000 CHAUFFEURS
-- ================================================================

-- Index sur la table drivers pour recherches et filtres fréquents
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_subscription_status ON drivers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_drivers_public_profile ON drivers(public_profile_enabled) WHERE public_profile_enabled = true;
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(home_latitude, home_longitude) WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;

-- Index sur la table clients pour associations et recherches
CREATE INDEX IF NOT EXISTS idx_clients_driver_id ON clients(driver_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_exclusive ON clients(is_exclusive);
CREATE INDEX IF NOT EXISTS idx_clients_driver_ids ON clients USING GIN(driver_ids);

-- Index sur la table courses pour filtres de statut et recherches temporelles
CREATE INDEX IF NOT EXISTS idx_courses_driver_id ON courses(driver_id);
CREATE INDEX IF NOT EXISTS idx_courses_client_id ON courses(client_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_scheduled_date ON courses(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_driver_ids ON courses USING GIN(driver_ids);

-- Index sur la table devis pour recherches par course et statut
CREATE INDEX IF NOT EXISTS idx_devis_course_id ON devis(course_id);
CREATE INDEX IF NOT EXISTS idx_devis_driver_id ON devis(driver_id);
CREATE INDEX IF NOT EXISTS idx_devis_client_id ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_status ON devis(status);
CREATE INDEX IF NOT EXISTS idx_devis_created_at ON devis(created_at DESC);

-- Index sur la table factures pour recherches financières et statut paiement
CREATE INDEX IF NOT EXISTS idx_factures_driver_id ON factures(driver_id);
CREATE INDEX IF NOT EXISTS idx_factures_client_id ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_payment_status ON factures(payment_status);
CREATE INDEX IF NOT EXISTS idx_factures_created_at ON factures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_factures_devis_id ON factures(devis_id);

-- Index sur la table notifications pour recherches utilisateur
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Index sur la table promotions pour validation codes promo
CREATE INDEX IF NOT EXISTS idx_promotions_driver_id ON promotions(driver_id);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active) WHERE active = true;

-- ================================================================
-- PHASE 2: MATERIALIZED VIEWS POUR STATISTIQUES OPTIMISÉES
-- ================================================================

-- Vue matérialisée pour statistiques chauffeurs (rafraîchissement horaire)
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
  COUNT(DISTINCT CASE WHEN DATE(co.created_at) = CURRENT_DATE THEN co.id END) as courses_today,
  
  -- Statistiques devis
  COUNT(DISTINCT dv.id) as total_quotes,
  COUNT(DISTINCT CASE WHEN dv.status = 'pending' THEN dv.id END) as pending_quotes,
  COUNT(DISTINCT CASE WHEN dv.status = 'accepted' THEN dv.id END) as accepted_quotes,
  COUNT(DISTINCT CASE WHEN dv.status = 'rejected' THEN dv.id END) as rejected_quotes,
  
  -- Statistiques factures et revenus
  COUNT(DISTINCT f.id) as total_invoices,
  COUNT(DISTINCT CASE WHEN f.payment_status = 'paid' THEN f.id END) as paid_invoices,
  COUNT(DISTINCT CASE WHEN f.payment_status = 'pending' THEN f.id END) as pending_invoices,
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' THEN f.amount ELSE 0 END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' AND DATE(f.paid_at) = CURRENT_DATE THEN f.amount ELSE 0 END), 0) as revenue_today,
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' AND f.paid_at >= DATE_TRUNC('week', CURRENT_DATE) THEN f.amount ELSE 0 END), 0) as revenue_this_week,
  COALESCE(SUM(CASE WHEN f.payment_status = 'paid' AND f.paid_at >= DATE_TRUNC('month', CURRENT_DATE) THEN f.amount ELSE 0 END), 0) as revenue_this_month,
  
  -- Métadonnées
  NOW() as last_updated
  
FROM drivers d
LEFT JOIN clients c ON c.driver_id = d.id OR d.id = ANY(c.driver_ids)
LEFT JOIN courses co ON co.driver_id = d.id OR d.id = ANY(co.driver_ids)
LEFT JOIN devis dv ON dv.driver_id = d.id
LEFT JOIN factures f ON f.driver_id = d.id
GROUP BY d.id, d.user_id;

-- Index sur la vue matérialisée pour recherches rapides
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_statistics_driver_id ON driver_statistics(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_statistics_user_id ON driver_statistics(user_id);

-- Fonction pour rafraîchir les statistiques (à appeler via cron job)
CREATE OR REPLACE FUNCTION refresh_driver_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY driver_statistics;
END;
$$;

-- ================================================================
-- PHASE 3: VUE POUR ISOLATION DES DONNÉES PAR CHAUFFEUR
-- ================================================================

-- Vue pour vérifier l'isolation des données par chauffeur
CREATE OR REPLACE VIEW driver_data_isolation AS
SELECT 
  d.id as driver_id,
  p.full_name as driver_name,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT co.id) as total_courses,
  COUNT(DISTINCT dv.id) as total_devis,
  COUNT(DISTINCT f.id) as total_factures
FROM drivers d
LEFT JOIN profiles p ON p.id = d.user_id
LEFT JOIN clients c ON c.driver_id = d.id OR d.id = ANY(c.driver_ids)
LEFT JOIN courses co ON co.driver_id = d.id OR d.id = ANY(co.driver_ids)
LEFT JOIN devis dv ON dv.driver_id = d.id
LEFT JOIN factures f ON f.driver_id = d.id
GROUP BY d.id, p.full_name;