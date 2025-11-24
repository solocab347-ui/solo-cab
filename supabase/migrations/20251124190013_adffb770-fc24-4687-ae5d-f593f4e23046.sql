-- Supprimer et recréer la vue en mode SECURITY INVOKER
-- pour qu'elle respecte les RLS des tables sous-jacentes
DROP VIEW IF EXISTS public.driver_data_isolation CASCADE;

CREATE VIEW public.driver_data_isolation
WITH (security_invoker = true)
AS
SELECT 
  d.id as driver_id,
  p.full_name as driver_name,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT co.id) as total_courses,
  COUNT(DISTINCT dv.id) as total_devis,
  COUNT(DISTINCT f.id) as total_factures
FROM public.drivers d
LEFT JOIN public.profiles p ON p.id = d.user_id
LEFT JOIN public.clients c ON c.driver_id = d.id OR d.id = ANY(c.driver_ids)
LEFT JOIN public.courses co ON co.driver_id = d.id OR d.id = ANY(co.driver_ids)
LEFT JOIN public.devis dv ON dv.driver_id = d.id
LEFT JOIN public.factures f ON f.driver_id = d.id
GROUP BY d.id, p.full_name;