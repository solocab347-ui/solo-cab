-- Fix SECURITY DEFINER view issue by recreating with security_invoker = true
DROP VIEW IF EXISTS public.driver_partnership_balances;

CREATE VIEW public.driver_partnership_balances
WITH (security_invoker = true)
AS
SELECT 
  dp.id as partnership_id,
  dp.driver_a_id,
  dp.driver_b_id,
  dp.commission_percentage,
  dp.status,
  dp.payment_schedule,
  dp.last_payment_date,
  COALESCE(SUM(CASE WHEN sc.sender_driver_id = dp.driver_a_id AND sc.status = 'completed' THEN sc.commission_amount ELSE 0 END), 0) as driver_a_owes_b,
  COALESCE(SUM(CASE WHEN sc.sender_driver_id = dp.driver_b_id AND sc.status = 'completed' THEN sc.commission_amount ELSE 0 END), 0) as driver_b_owes_a,
  COALESCE(SUM(CASE WHEN sc.sender_driver_id = dp.driver_a_id AND sc.status = 'completed' THEN sc.commission_amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN sc.sender_driver_id = dp.driver_b_id AND sc.status = 'completed' THEN sc.commission_amount ELSE 0 END), 0) as net_balance_a_to_b
FROM public.driver_partnerships dp
LEFT JOIN public.shared_courses sc ON sc.partnership_id = dp.id
GROUP BY dp.id, dp.driver_a_id, dp.driver_b_id, dp.commission_percentage, dp.status, dp.payment_schedule, dp.last_payment_date;