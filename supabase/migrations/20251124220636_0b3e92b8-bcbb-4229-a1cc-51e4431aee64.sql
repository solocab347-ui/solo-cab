-- ==========================================
-- MIGRATION: Index critiques pour scalabilité
-- Support: 1000 chauffeurs + 500,000 clients
-- ==========================================

-- Index sur clients pour requêtes drivers
CREATE INDEX IF NOT EXISTS idx_clients_driver_id_exclusive 
ON public.clients(driver_id, is_exclusive) 
WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_driver_ids_gin 
ON public.clients USING GIN(driver_ids);

CREATE INDEX IF NOT EXISTS idx_clients_is_exclusive 
ON public.clients(is_exclusive);

-- Index sur courses pour filtrage par statut
CREATE INDEX IF NOT EXISTS idx_courses_driver_status 
ON public.courses(driver_id, status, scheduled_date DESC) 
WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_client_status 
ON public.courses(client_id, status, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_courses_scheduled_date 
ON public.courses(scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_courses_status 
ON public.courses(status);

CREATE INDEX IF NOT EXISTS idx_courses_driver_ids_gin 
ON public.courses USING GIN(driver_ids);

-- Index sur devis pour filtrage
CREATE INDEX IF NOT EXISTS idx_devis_driver_status 
ON public.devis(driver_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_devis_client_status 
ON public.devis(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_devis_course_id 
ON public.devis(course_id);

-- Index sur factures pour filtrage
CREATE INDEX IF NOT EXISTS idx_factures_driver_payment 
ON public.factures(driver_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_factures_client_payment 
ON public.factures(client_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_factures_course_id 
ON public.factures(course_id);

-- Index sur drivers pour profil public et recherche
CREATE INDEX IF NOT EXISTS idx_drivers_public_status 
ON public.drivers(public_profile_enabled, status) 
WHERE public_profile_enabled = true AND status = 'validated';

CREATE INDEX IF NOT EXISTS idx_drivers_home_location 
ON public.drivers(home_latitude, home_longitude) 
WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drivers_status 
ON public.drivers(status);

CREATE INDEX IF NOT EXISTS idx_drivers_working_sectors_gin 
ON public.drivers USING GIN(working_sectors);

-- Index sur conversations pour messagerie
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 
ON public.conversations(participant_1_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_participant2 
ON public.conversations(participant_2_id, last_message_at DESC);

-- Index sur messages pour performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender 
ON public.messages(sender_id, created_at DESC);

-- Index sur notifications pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON public.notifications(user_id, is_read, created_at DESC);

-- Index sur promotions
CREATE INDEX IF NOT EXISTS idx_promotions_driver_active 
ON public.promotions(driver_id, active) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_promotions_code 
ON public.promotions(code) 
WHERE active = true;

-- Index sur QR codes
CREATE INDEX IF NOT EXISTS idx_qr_codes_code 
ON public.qr_codes(code) 
WHERE is_active = true;

-- Index sur user_roles pour performance RLS
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);

-- Index sur profiles pour recherche
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

-- Index sur disputes
CREATE INDEX IF NOT EXISTS idx_disputes_status 
ON public.disputes(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disputes_reported_by 
ON public.disputes(reported_by_user_id, created_at DESC);

-- Index sur driver_feedback
CREATE INDEX IF NOT EXISTS idx_driver_feedback_status 
ON public.driver_feedback(driver_id, status, created_at DESC);

-- Index sur assistant_requests
CREATE INDEX IF NOT EXISTS idx_assistant_requests_driver_status 
ON public.assistant_requests(driver_id, status, created_at DESC);

-- Statistiques à jour pour l'optimiseur
ANALYZE public.clients;
ANALYZE public.courses;
ANALYZE public.devis;
ANALYZE public.factures;
ANALYZE public.drivers;
ANALYZE public.conversations;
ANALYZE public.messages;
ANALYZE public.notifications;
ANALYZE public.promotions;