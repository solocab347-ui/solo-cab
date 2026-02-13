
-- =============================================
-- FIX 1: Add security_invoker to views missing it
-- =============================================
CREATE OR REPLACE VIEW public.driver_data_isolation
WITH (security_invoker=on) AS
SELECT d.id AS driver_id,
    p.full_name AS driver_name,
    count(DISTINCT c.id) AS total_clients,
    count(DISTINCT co.id) AS total_courses,
    count(DISTINCT dv.id) AS total_devis,
    count(DISTINCT f.id) AS total_factures
   FROM (((((drivers d
     LEFT JOIN profiles p ON ((p.id = d.user_id)))
     LEFT JOIN clients c ON (((c.driver_id = d.id) OR (d.id = ANY (c.driver_ids)))))
     LEFT JOIN courses co ON (((co.driver_id = d.id) OR (d.id = ANY (co.driver_ids)))))
     LEFT JOIN devis dv ON ((dv.driver_id = d.id)))
     LEFT JOIN factures f ON ((f.driver_id = d.id)))
  GROUP BY d.id, p.full_name;

ALTER VIEW public.driver_partnership_balances SET (security_invoker = on);
ALTER VIEW public.driver_partner_courses_view SET (security_invoker = on);
ALTER VIEW public.available_partner_courses SET (security_invoker = on);
ALTER VIEW public.error_learning_metrics SET (security_invoker = on);
ALTER VIEW public.company_fleet_course_requests_view SET (security_invoker = on);
ALTER VIEW public.fleet_client_dashboard_view SET (security_invoker = on);
ALTER VIEW public.fleet_company_courses_view SET (security_invoker = on);

-- =============================================
-- FIX 2: Make sensitive document buckets private
-- =============================================
UPDATE storage.buckets SET public = false WHERE id IN (
  'driver-documents',
  'fleet-manager-documents', 
  'fleet-documents',
  'company-documents',
  'payment-documents'
);
