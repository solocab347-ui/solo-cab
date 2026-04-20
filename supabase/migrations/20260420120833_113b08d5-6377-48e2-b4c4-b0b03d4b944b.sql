-- VAGUE 3 : Suppression des index inutilisés (idx_scan = 0)
-- Gain: réduit le coût d'écriture sur les tables chaudes (courses, devis, notifications, drivers)
-- et libère de l'espace disque cache.

-- courses
DROP INDEX IF EXISTS public.idx_courses_client_status;
DROP INDEX IF EXISTS public.idx_courses_course_number;

-- devis
DROP INDEX IF EXISTS public.idx_devis_driver_status;
DROP INDEX IF EXISTS public.idx_devis_created_at;
DROP INDEX IF EXISTS public.idx_devis_client_status;
DROP INDEX IF EXISTS public.idx_devis_quote_number;

-- notifications (deux index quasi-doublons jamais utilisés)
DROP INDEX IF EXISTS public.idx_notifications_user_read;
DROP INDEX IF EXISTS public.idx_notifications_user_read_created;

-- drivers (deux index sur working_sectors, l'un GIN l'autre btree)
DROP INDEX IF EXISTS public.idx_drivers_working_sectors_gin;
DROP INDEX IF EXISTS public.idx_drivers_working_sectors;

-- security_audit_logs
DROP INDEX IF EXISTS public.idx_security_audit_logs_created_at;