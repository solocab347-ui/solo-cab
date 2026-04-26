-- Suppression des 2 virements de test bloqués (Insufficient funds) et leurs alertes
DELETE FROM public.settlement_alerts
WHERE details->>'driver_weekly_balance_id' IN (
  'd1f309fe-2752-4758-8cca-ec83966ba84e',
  '3ac67661-1238-47e5-8df5-b8fad97fdc16'
);

DELETE FROM public.driver_weekly_balances
WHERE id IN (
  'd1f309fe-2752-4758-8cca-ec83966ba84e',
  '3ac67661-1238-47e5-8df5-b8fad97fdc16'
);