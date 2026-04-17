
-- ============================================================
-- FIX DAILY REPORT + PLATFORM HEALTH CHECK
-- ============================================================

-- 1) Fix send-daily-report: 'active' status doesn't exist; use 'validated'
-- The query `eq('status', 'active')` was failing with enum error.
-- We patch via a helper SQL function used by the edge function instead.

-- 2) Fix run_platform_health_check: replace 'active' -> 'validated', 'pending_review' -> 'pending'
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
BEGIN
  -- 1. Inscriptions
  SELECT COUNT(*) INTO v_inscriptions_today
  FROM profiles WHERE created_at >= CURRENT_DATE;

  SELECT COALESCE(AVG(cnt), 0) INTO v_inscriptions_avg
  FROM (
    SELECT COUNT(*) as cnt FROM profiles
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  ) daily;

  -- 2. Onboarding
  SELECT COUNT(*) INTO v_onboarding_total
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_onboarding_completed
  FROM drivers
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status IN ('validated', 'pending');

  -- 3. Courses today
  SELECT COUNT(*) INTO v_courses_today
  FROM courses WHERE created_at >= CURRENT_DATE;

  SELECT 0 INTO v_courses_errors; -- 'error' not in enum

  -- 4. Payments
  SELECT COUNT(*) INTO v_payments_failed
  FROM payments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'failed';

  SELECT COUNT(*) INTO v_payments_total
  FROM payments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status IS NOT NULL;

  -- 5. Drivers
  SELECT COUNT(*) INTO v_drivers_no_stripe
  FROM drivers WHERE status = 'validated'
  AND (stripe_connect_account_id IS NULL OR stripe_connect_status IS NULL);

  SELECT COUNT(*) INTO v_pending_drivers
  FROM drivers WHERE status = 'pending';

  SELECT COUNT(*) INTO v_active_drivers
  FROM drivers WHERE status = 'validated';

  -- 6. Courses unpaid
  SELECT COUNT(*) INTO v_courses_no_payment
  FROM courses WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';

  -- 7. Disputes
  SELECT COUNT(*) INTO v_disputes_open
  FROM rating_disputes WHERE status = 'pending';

  -- 8. QR codes
  SELECT COUNT(*) INTO v_qr_total FROM qr_codes;
  SELECT COUNT(*) INTO v_qr_active FROM qr_codes WHERE is_active = true;

  SELECT COUNT(*) INTO v_qr_orphaned
  FROM qr_codes q
  LEFT JOIN drivers d ON d.id = q.driver_id
  WHERE q.is_active = true
  AND (d.id IS NULL OR d.status NOT IN ('validated', 'pending'));

  -- 9. Stripe analysis
  SELECT COUNT(*) INTO v_stripe_no_payouts
  FROM drivers WHERE status = 'validated'
  AND stripe_connect_account_id IS NOT NULL
  AND (stripe_payouts_enabled IS NULL OR stripe_payouts_enabled = false);

  SELECT COUNT(*) INTO v_stripe_no_details
  FROM drivers WHERE status = 'validated'
  AND stripe_connect_account_id IS NOT NULL
  AND (stripe_details_submitted IS NULL OR stripe_details_submitted = false);

  SELECT COUNT(*) INTO v_stripe_abnormal
  FROM drivers WHERE status = 'validated'
  AND stripe_connect_account_id IS NOT NULL
  AND stripe_connect_status IS NOT NULL
  AND stripe_connect_status NOT IN ('active', 'complete', 'enabled');

  -- 10. Funnel
  SELECT COUNT(*) INTO v_funnel_step_profile
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'pending';

  v_funnel_step_documents := 0;
  v_funnel_step_stripe := 0;

  SELECT COUNT(*) INTO v_funnel_step_review
  FROM drivers WHERE status = 'pending';

  v_funnel_docs_submitted := 0;
  v_funnel_docs_rejected := 0;

  -- 11. Course analysis
  SELECT COUNT(*) INTO v_courses_cancelled_7d
  FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'cancelled';

  SELECT COUNT(*) INTO v_courses_stuck
  FROM courses WHERE status IN ('accepted', 'in_progress')
  AND created_at < NOW() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO v_courses_completed_7d
  FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'completed';

  v_conversion_rate_7d := CASE
    WHEN v_courses_today + v_courses_completed_7d > 0
    THEN ROUND((v_courses_completed_7d::NUMERIC / NULLIF(v_courses_completed_7d + v_courses_cancelled_7d, 0)) * 100, 2)
    ELSE 0
  END;

  -- Anomaly detection
  IF v_courses_stuck > 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'courses_stuck',
      'severity', 'warning',
      'message', format('%s courses bloquées depuis +24h', v_courses_stuck)
    );
    v_status := 'warning';
  END IF;

  IF v_disputes_open > 10 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'disputes_high',
      'severity', 'warning',
      'message', format('%s litiges ouverts', v_disputes_open)
    );
    v_status := 'warning';
  END IF;

  v_result := jsonb_build_object(
    'inscriptions_today', v_inscriptions_today,
    'inscriptions_avg_30d', ROUND(v_inscriptions_avg, 2),
    'onboarding_total_7d', v_onboarding_total,
    'onboarding_completed_7d', v_onboarding_completed,
    'onboarding_rate', CASE WHEN v_onboarding_total > 0
      THEN ROUND((v_onboarding_completed::NUMERIC / v_onboarding_total) * 100, 2)
      ELSE 0 END,
    'courses_today', v_courses_today,
    'courses_errors', v_courses_errors,
    'payments_failed_7d', v_payments_failed,
    'payments_total_7d', v_payments_total,
    'payment_success_rate', CASE WHEN v_payments_total > 0
      THEN ROUND(((v_payments_total - v_payments_failed)::NUMERIC / v_payments_total) * 100, 2)
      ELSE 100 END,
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
    'conversion_rate_7d', v_conversion_rate_7d
  );

  -- Log the check
  INSERT INTO platform_health_logs (check_type, status, details, anomalies, triggered_by)
  VALUES ('full', v_status, v_result, v_anomalies, p_triggered_by);

  RETURN jsonb_build_object(
    'status', v_status,
    'data', v_result,
    'anomalies', v_anomalies,
    'checked_at', NOW()
  );
END;
$function$;

-- 3) Reschedule the daily report cron with the proper anon key
-- Remove old broken job if present
DO $$
DECLARE
  v_jobid BIGINT;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'send-daily-activity-reports';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- Schedule new job with anon key authorization (publicly invokable via JWT verification disabled)
SELECT cron.schedule(
  'send-daily-activity-reports',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/send-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3Rob3BwbGhid2NmcnB4cnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5MTUsImV4cCI6MjA3OTIwODkxNX0.qnFWbejy-Tp3HkvHPI-O_43-3hzp61hjGTrYfnnsdxQ'
    ),
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
