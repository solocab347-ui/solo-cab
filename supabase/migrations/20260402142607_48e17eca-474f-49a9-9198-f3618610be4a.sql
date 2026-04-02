
CREATE OR REPLACE VIEW public.driver_wallets AS
SELECT 
  d.id AS driver_id,
  d.user_id,
  COALESCE(SUM(st.gross_amount), 0) AS total_revenue,
  COALESCE(SUM(st.solocab_fee_amount), 0) AS total_solocab_fees,
  COALESCE(SUM(st.stripe_fee_amount), 0) AS total_stripe_fees,
  COALESCE(SUM(st.net_amount), 0) AS net_earnings,
  COUNT(st.id) AS total_courses,
  COALESCE(
    (SELECT SUM(st2.net_amount) FROM stripe_transactions st2 
     WHERE st2.driver_id = d.id AND st2.status = 'succeeded' 
     AND st2.stripe_transfer_id IS NULL), 0
  ) AS pending_balance,
  COALESCE(
    (SELECT SUM(st3.net_amount) FROM stripe_transactions st3 
     WHERE st3.driver_id = d.id AND st3.status = 'succeeded' 
     AND st3.stripe_transfer_id IS NOT NULL), 0
  ) AS paid_out_balance
FROM drivers d
LEFT JOIN stripe_transactions st ON st.driver_id = d.id AND st.status = 'succeeded'
GROUP BY d.id, d.user_id;

ALTER VIEW public.driver_wallets SET (security_invoker = on);
