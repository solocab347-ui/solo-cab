-- ============================================================
-- 1. FIX run_platform_health_check
-- Bug: rating_disputes has no "status" column, uses resolved_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_platform_health_check(p_triggered_by text DEFAULT 'auto'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_anomalies JSONB := '[]'::jsonb;
  v_status TEXT := 'ok';
  v_inscriptions_today INT;
  v_inscriptions_avg NUMERIC;
  v_onboarding_completed INT;
  v_onboarding_total INT;
  v_courses_today INT;
  v_courses_errors INT;
  v_payments_failed INT;
  v_payments_total INT;
  v_drivers_no_stripe INT;
  v_pending_drivers INT;
  v_active_drivers INT;
  v_courses_no_payment INT;
  v_disputes_open INT;
  v_qr_total INT;
  v_qr_active INT;
  v_qr_orphaned INT;
  v_stripe_no_payouts INT;
  v_stripe_no_details INT;
  v_stripe_abnormal INT;
  v_funnel_step_profile INT;
  v_funnel_step_documents INT;
  v_funnel_step_stripe INT;
  v_funnel_step_review INT;
  v_funnel_docs_submitted INT;
  v_funnel_docs_rejected INT;
  v_courses_cancelled_7d INT;
  v_courses_stuck INT;
  v_courses_completed_7d INT;
  v_conversion_rate_7d NUMERIC;
  v_failed_transfers_pending INT;
BEGIN
  SELECT COUNT(*) INTO v_inscriptions_today FROM profiles WHERE created_at >= CURRENT_DATE;
  SELECT COALESCE(AVG(cnt), 0) INTO v_inscriptions_avg
  FROM (SELECT COUNT(*) as cnt FROM profiles WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(created_at)) daily;

  SELECT COUNT(*) INTO v_onboarding_total FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_onboarding_completed FROM drivers
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status IN ('validated', 'pending');

  SELECT COUNT(*) INTO v_courses_today FROM courses WHERE created_at >= CURRENT_DATE;
  SELECT 0 INTO v_courses_errors;

  SELECT COUNT(*) INTO v_payments_failed FROM payments
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'failed';
  SELECT COUNT(*) INTO v_payments_total FROM payments
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status IS NOT NULL;

  SELECT COUNT(*) INTO v_drivers_no_stripe FROM drivers
    WHERE status = 'validated' AND (stripe_connect_account_id IS NULL OR stripe_connect_status IS NULL);
  SELECT COUNT(*) INTO v_pending_drivers FROM drivers WHERE status = 'pending';
  SELECT COUNT(*) INTO v_active_drivers FROM drivers WHERE status = 'validated';

  SELECT COUNT(*) INTO v_courses_no_payment FROM courses
    WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '7 days';

  -- ✅ FIX: rating_disputes utilise resolved_at, pas status
  SELECT COUNT(*) INTO v_disputes_open FROM rating_disputes WHERE resolved_at IS NULL;

  SELECT COUNT(*) INTO v_qr_total FROM qr_codes;
  SELECT COUNT(*) INTO v_qr_active FROM qr_codes WHERE is_active = true;
  SELECT COUNT(*) INTO v_qr_orphaned FROM qr_codes q
    LEFT JOIN drivers d ON d.id = q.driver_id
    WHERE q.is_active = true AND (d.id IS NULL OR d.status NOT IN ('validated', 'pending'));

  SELECT COUNT(*) INTO v_stripe_no_payouts FROM drivers
    WHERE status = 'validated' AND stripe_connect_account_id IS NOT NULL
    AND (stripe_payouts_enabled IS NULL OR stripe_payouts_enabled = false);
  SELECT COUNT(*) INTO v_stripe_no_details FROM drivers
    WHERE status = 'validated' AND stripe_connect_account_id IS NOT NULL
    AND (stripe_details_submitted IS NULL OR stripe_details_submitted = false);
  SELECT COUNT(*) INTO v_stripe_abnormal FROM drivers
    WHERE status = 'validated' AND stripe_connect_account_id IS NOT NULL
    AND stripe_connect_status IS NOT NULL AND stripe_connect_status NOT IN ('active', 'complete', 'enabled');

  SELECT COUNT(*) INTO v_funnel_step_profile FROM drivers
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND status = 'pending';
  v_funnel_step_documents := 0;
  v_funnel_step_stripe := 0;
  SELECT COUNT(*) INTO v_funnel_step_review FROM drivers WHERE status = 'pending';
  v_funnel_docs_submitted := 0;
  v_funnel_docs_rejected := 0;

  SELECT COUNT(*) INTO v_courses_cancelled_7d FROM courses
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'cancelled';
  SELECT COUNT(*) INTO v_courses_stuck FROM courses
    WHERE status IN ('accepted', 'in_progress') AND created_at < NOW() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO v_courses_completed_7d FROM courses
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'completed';

  IF (v_courses_completed_7d + v_courses_cancelled_7d) > 0 THEN
    v_conversion_rate_7d := ROUND((v_courses_completed_7d::NUMERIC / (v_courses_completed_7d + v_courses_cancelled_7d) * 100), 1);
  ELSE
    v_conversion_rate_7d := 0;
  END IF;

  -- ✅ Failed transfers indicator (nouveau)
  SELECT COUNT(*) INTO v_failed_transfers_pending FROM failed_transfers
    WHERE status NOT IN ('resolved', 'cancelled', 'permanently_failed');

  -- Anomalies
  IF v_pending_drivers > 10 THEN
    v_anomalies := v_anomalies || jsonb_build_object('type', 'pending_drivers_high', 'severity', 'warning',
      'message', 'Plus de 10 chauffeurs en attente de validation');
    v_status := 'warning';
  END IF;
  IF v_drivers_no_stripe > 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object('type', 'drivers_no_stripe', 'severity', 'critical',
      'message', v_drivers_no_stripe || ' chauffeurs validés sans Stripe Connect');
    v_status := 'critical';
  END IF;
  IF v_payments_total > 0 AND (v_payments_failed::NUMERIC / v_payments_total) > 0.10 THEN
    v_anomalies := v_anomalies || jsonb_build_object('type', 'payment_failure_rate', 'severity', 'critical',
      'message', 'Taux d''échec paiements > 10%');
    v_status := 'critical';
  END IF;
  IF v_disputes_open > 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object('type', 'disputes_high', 'severity', 'warning',
      'message', v_disputes_open || ' litiges ouverts');
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;
  IF v_courses_stuck > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object('type', 'courses_stuck', 'severity', 'warning',
      'message', v_courses_stuck || ' courses bloquées depuis plus de 24h');
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;
  IF v_failed_transfers_pending > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object('type', 'failed_transfers', 'severity', 'critical',
      'message', v_failed_transfers_pending || ' virement(s) bloqué(s) en attente de résolution');
    v_status := 'critical';
  END IF;

  v_result := jsonb_build_object(
    'inscriptions_today', v_inscriptions_today,
    'inscriptions_avg_30d', ROUND(v_inscriptions_avg, 1),
    'onboarding_completed_7d', v_onboarding_completed,
    'onboarding_total_7d', v_onboarding_total,
    'onboarding_rate', CASE WHEN v_onboarding_total > 0 THEN ROUND((v_onboarding_completed::NUMERIC / v_onboarding_total * 100), 1) ELSE 0 END,
    'courses_today', v_courses_today,
    'courses_errors', v_courses_errors,
    'payments_failed_7d', v_payments_failed,
    'payments_total_7d', v_payments_total,
    'payment_success_rate', CASE WHEN v_payments_total > 0 THEN ROUND(((v_payments_total - v_payments_failed)::NUMERIC / v_payments_total * 100), 1) ELSE 100 END,
    'drivers_no_stripe', v_drivers_no_stripe,
    'pending_drivers', v_pending_drivers,
    'active_drivers', v_active_drivers,
    'courses_no_payment', v_courses_no_payment,
    'disputes_open', v_disputes_open,
    'qr_total', v_qr_total,
    'qr_active', v_qr_active,
    'qr_orphaned', v_qr_orphaned,
    'stripe_no_payouts', v_stripe_no_payouts,
    'stripe_no_details', v_stripe_no_details,
    'stripe_abnormal', v_stripe_abnormal,
    'funnel_step_profile', v_funnel_step_profile,
    'funnel_step_documents', v_funnel_step_documents,
    'funnel_step_stripe', v_funnel_step_stripe,
    'funnel_step_review', v_funnel_step_review,
    'funnel_docs_submitted', v_funnel_docs_submitted,
    'funnel_docs_rejected', v_funnel_docs_rejected,
    'courses_cancelled_7d', v_courses_cancelled_7d,
    'courses_stuck', v_courses_stuck,
    'courses_completed_7d', v_courses_completed_7d,
    'conversion_rate_7d', v_conversion_rate_7d,
    'failed_transfers_pending', v_failed_transfers_pending
  );

  INSERT INTO platform_health_logs (check_type, status, details, anomalies, triggered_by)
  VALUES ('full', v_status, v_result, v_anomalies, p_triggered_by);

  RETURN jsonb_build_object('status', v_status, 'data', v_result, 'anomalies', v_anomalies, 'checked_at', NOW());
END;
$function$;

-- ============================================================
-- 2. SCHEDULE CRON JOBS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Nettoyage anciens jobs si présents
DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobid, jobname FROM cron.job WHERE jobname IN (
    'platform-health-check-daily',
    'retry-failed-transfers-daily',
    'failed-transfers-reminder-weekly'
  ) LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

-- Rapport santé admin tous les matins à 7h (UTC = 6h Paris été / 7h Paris hiver — proche du matin)
SELECT cron.schedule(
  'platform-health-check-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/platform-health-check',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3Rob3BwbGhid2NmcnB4cnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5MTUsImV4cCI6MjA3OTIwODkxNX0.qnFWbejy-Tp3HkvHPI-O_43-3hzp61hjGTrYfnnsdxQ"}'::jsonb,
    body := '{"source": "cron-daily"}'::jsonb
  );
  $$
);

-- Retry quotidien des virements échoués (6h30 UTC)
SELECT cron.schedule(
  'retry-failed-transfers-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/retry-failed-transfers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3Rob3BwbGhid2NmcnB4cnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5MTUsImV4cCI6MjA3OTIwODkxNX0.qnFWbejy-Tp3HkvHPI-O_43-3hzp61hjGTrYfnnsdxQ"}'::jsonb,
    body := '{"source": "cron-daily", "mode": "auto"}'::jsonb
  );
  $$
);

-- Rappel hebdomadaire chauffeurs avec virement bloqué > 7j (lundi 9h)
SELECT cron.schedule(
  'failed-transfers-reminder-weekly',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/retry-failed-transfers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3Rob3BwbGhid2NmcnB4cnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5MTUsImV4cCI6MjA3OTIwODkxNX0.qnFWbejy-Tp3HkvHPI-O_43-3hzp61hjGTrYfnnsdxQ"}'::jsonb,
    body := '{"source": "cron-weekly", "mode": "reminder"}'::jsonb
  );
  $$
);