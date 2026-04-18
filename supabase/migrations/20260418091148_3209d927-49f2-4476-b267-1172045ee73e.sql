-- Phase 1: Indexes critiques pour éliminer les HTTP 500 et accélérer les boot dashboards
-- Tous les indexes utilisent CREATE INDEX IF NOT EXISTS pour être idempotents

-- profiles : utilisé partout (auth, lookup user)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON public.profiles(id) INCLUDE (preferred_language);

-- factures : timeout HTTP 500 actuel
CREATE INDEX IF NOT EXISTS idx_factures_client_payment_status ON public.factures(client_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_factures_driver_status ON public.factures(driver_id, payment_status);

-- courses : requêtes les plus fréquentes
CREATE INDEX IF NOT EXISTS idx_courses_client_status ON public.courses(client_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_client_status_updated ON public.courses(client_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_driver_status ON public.courses(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_scheduled_date ON public.courses(scheduled_date) WHERE status IN ('pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by_user_id);

-- notifications : 100 dernières par user
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- course_ratings : alertes contestation et pending
CREATE INDEX IF NOT EXISTS idx_course_ratings_client_status_direction ON public.course_ratings(client_id, status, rating_direction);
CREATE INDEX IF NOT EXISTS idx_course_ratings_driver_status_direction ON public.course_ratings(driver_id, status, rating_direction);

-- clients : lookup par user
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- user_roles : check role à chaque page
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- push_subscriptions : check actif
CREATE INDEX IF NOT EXISTS idx_push_subs_user_active ON public.push_subscriptions(user_id, is_active) WHERE is_active = true;

-- client_driver_blocks
CREATE INDEX IF NOT EXISTS idx_blocks_client_blocked_by ON public.client_driver_blocks(client_id, blocked_by);
CREATE INDEX IF NOT EXISTS idx_blocks_driver ON public.client_driver_blocks(driver_id);

-- devis : pending par client
CREATE INDEX IF NOT EXISTS idx_devis_client_status_valid ON public.devis(client_id, status, valid_until);

-- company_employees : check actif
CREATE INDEX IF NOT EXISTS idx_company_employees_user_active ON public.company_employees(user_id, is_active) WHERE is_active = true;

-- drivers : lookup par user_id (très fréquent)
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id);

-- ANALYZE pour mettre à jour les stats du planificateur
ANALYZE public.profiles;
ANALYZE public.factures;
ANALYZE public.courses;
ANALYZE public.notifications;
ANALYZE public.course_ratings;
ANALYZE public.clients;
ANALYZE public.user_roles;
ANALYZE public.push_subscriptions;
ANALYZE public.client_driver_blocks;
ANALYZE public.devis;
ANALYZE public.company_employees;
ANALYZE public.drivers;