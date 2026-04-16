
CREATE OR REPLACE FUNCTION public.run_platform_health_check(p_triggered_by TEXT DEFAULT 'auto')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_anomalies JSONB := '[]'::jsonb;
  v_status TEXT := 'ok';
  -- Existing metrics
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
  -- NEW: QR Code metrics
  v_qr_total INT;
  v_qr_active INT;
  v_qr_orphaned INT;
  -- NEW: Stripe detailed
  v_stripe_no_payouts INT;
  v_stripe_no_details INT;
  v_stripe_abnormal INT;
  -- NEW: Funnel breakdown
  v_funnel_step_profile INT;
  v_funnel_step_documents INT;
  v_funnel_step_stripe INT;
  v_funnel_step_review INT;
  v_funnel_docs_submitted INT;
  v_funnel_docs_rejected INT;
  -- NEW: Course analysis
  v_courses_cancelled_7d INT;
  v_courses_stuck INT;
  v_courses_completed_7d INT;
  v_conversion_rate_7d NUMERIC;
BEGIN
  -- 1. Inscription analysis
  SELECT COUNT(*) INTO v_inscriptions_today
  FROM profiles WHERE created_at >= CURRENT_DATE;

  SELECT COALESCE(AVG(cnt), 0) INTO v_inscriptions_avg
  FROM (
    SELECT COUNT(*) as cnt FROM profiles
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  ) daily;

  -- 2. Onboarding completion
  SELECT COUNT(*) INTO v_onboarding_total
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_onboarding_completed
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status IN ('active', 'pending_review');

  -- 3. Courses today
  SELECT COUNT(*) INTO v_courses_today
  FROM courses WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_courses_errors
  FROM courses WHERE created_at >= CURRENT_DATE AND status = 'error';

  -- 4. Payment analysis
  SELECT COUNT(*) INTO v_payments_failed
  FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND payment_status = 'failed';

  SELECT COUNT(*) INTO v_payments_total
  FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND payment_status IS NOT NULL;

  -- 5. Drivers without Stripe
  SELECT COUNT(*) INTO v_drivers_no_stripe
  FROM drivers WHERE status = 'active'
  AND (stripe_connect_account_id IS NULL OR stripe_connect_charges_enabled = false);

  -- 6. Pending drivers
  SELECT COUNT(*) INTO v_pending_drivers
  FROM drivers WHERE status = 'pending_review';

  -- 7. Active drivers
  SELECT COUNT(*) INTO v_active_drivers
  FROM drivers WHERE status = 'active';

  -- 8. Courses without payment
  SELECT COUNT(*) INTO v_courses_no_payment
  FROM courses WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND payment_status IS NULL;

  -- 9. Open disputes
  SELECT COUNT(*) INTO v_disputes_open
  FROM rating_disputes WHERE status = 'pending';

  -- ===== NEW: QR CODE CHECKS =====
  SELECT COUNT(*) INTO v_qr_total FROM qr_codes;
  SELECT COUNT(*) INTO v_qr_active FROM qr_codes WHERE is_active = true;
  
  -- QR codes linked to inactive/non-existent drivers
  SELECT COUNT(*) INTO v_qr_orphaned
  FROM qr_codes q
  LEFT JOIN drivers d ON d.id = q.driver_id
  WHERE q.is_active = true
  AND (d.id IS NULL OR d.status NOT IN ('active', 'pending_review'));

  -- ===== NEW: STRIPE DETAILED =====
  SELECT COUNT(*) INTO v_stripe_no_payouts
  FROM drivers WHERE status = 'active'
  AND stripe_connect_account_id IS NOT NULL
  AND stripe_connect_payouts_enabled = false;

  SELECT COUNT(*) INTO v_stripe_no_details
  FROM drivers WHERE status = 'active'
  AND stripe_connect_account_id IS NOT NULL
  AND stripe_connect_details_submitted = false;

  SELECT COUNT(*) INTO v_stripe_abnormal
  FROM drivers WHERE status = 'active'
  AND stripe_connect_account_id IS NOT NULL
  AND stripe_connect_status IS NOT NULL
  AND stripe_connect_status NOT IN ('active', 'complete', 'enabled');

  -- ===== NEW: FUNNEL BREAKDOWN (last 30 days) =====
  SELECT COUNT(*) INTO v_funnel_step_profile
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND (onboarding_step = 'profile' OR onboarding_profile_completed = false);

  SELECT COUNT(*) INTO v_funnel_step_documents
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND onboarding_step = 'documents';

  SELECT COUNT(*) INTO v_funnel_step_stripe
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND onboarding_step = 'stripe';

  SELECT COUNT(*) INTO v_funnel_step_review
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'pending_review';

  SELECT COUNT(*) INTO v_funnel_docs_submitted
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND documents_status = 'submitted';

  SELECT COUNT(*) INTO v_funnel_docs_rejected
  FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND documents_status = 'rejected';

  -- ===== NEW: COURSE ANALYSIS =====
  SELECT COUNT(*) INTO v_courses_cancelled_7d
  FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'cancelled';

  -- Courses stuck in 'assigned' or 'in_progress' for > 3 hours
  SELECT COUNT(*) INTO v_courses_stuck
  FROM courses WHERE status IN ('assigned', 'in_progress')
  AND updated_at < NOW() - INTERVAL '3 hours';

  SELECT COUNT(*) INTO v_courses_completed_7d
  FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'completed';

  -- Conversion rate: completed / total created (7d)
  v_conversion_rate_7d := CASE 
    WHEN (SELECT COUNT(*) FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') > 0 
    THEN ROUND(v_courses_completed_7d::NUMERIC / (SELECT COUNT(*) FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') * 100, 1)
    ELSE 0 
  END;

  -- Build result
  v_result := jsonb_build_object(
    'inscriptions_today', v_inscriptions_today,
    'inscriptions_avg_30d', ROUND(v_inscriptions_avg, 1),
    'onboarding_total_7d', v_onboarding_total,
    'onboarding_completed_7d', v_onboarding_completed,
    'onboarding_rate', CASE WHEN v_onboarding_total > 0 THEN ROUND((v_onboarding_completed::NUMERIC / v_onboarding_total) * 100, 1) ELSE 0 END,
    'courses_today', v_courses_today,
    'courses_errors', v_courses_errors,
    'payments_failed_7d', v_payments_failed,
    'payments_total_7d', v_payments_total,
    'payment_success_rate', CASE WHEN v_payments_total > 0 THEN ROUND(((v_payments_total - v_payments_failed)::NUMERIC / v_payments_total) * 100, 1) ELSE 100 END,
    'drivers_no_stripe', v_drivers_no_stripe,
    'pending_drivers', v_pending_drivers,
    'active_drivers', v_active_drivers,
    'courses_no_payment', v_courses_no_payment,
    'disputes_open', v_disputes_open,
    -- NEW fields
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

  -- ===== ANOMALY DETECTION =====

  -- Inscription drop > 30%
  IF v_inscriptions_avg > 0 AND v_inscriptions_today < (v_inscriptions_avg * 0.7) THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'inscription_drop',
      'severity', 'warning',
      'message', format('Inscriptions en chute: %s aujourd''hui vs %s moyenne', v_inscriptions_today, ROUND(v_inscriptions_avg, 1))
    ));
    v_status := 'warning';
  END IF;

  -- Onboarding rate < 50%
  IF v_onboarding_total > 2 AND (v_onboarding_completed::NUMERIC / v_onboarding_total) < 0.5 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'onboarding_low',
      'severity', 'warning',
      'message', format('Taux d''onboarding bas: %s%%', ROUND((v_onboarding_completed::NUMERIC / v_onboarding_total) * 100, 1))
    ));
    v_status := 'warning';
  END IF;

  -- Payment failures > 10%
  IF v_payments_total > 5 AND (v_payments_failed::NUMERIC / v_payments_total) > 0.1 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'payment_failures',
      'severity', 'critical',
      'message', format('Taux d''échec paiement élevé: %s/%s', v_payments_failed, v_payments_total)
    ));
    v_status := 'critical';
  END IF;

  -- Course errors
  IF v_courses_errors > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'course_errors',
      'severity', 'critical',
      'message', format('%s courses en erreur aujourd''hui', v_courses_errors)
    ));
    v_status := 'critical';
  END IF;

  -- Drivers without Stripe
  IF v_drivers_no_stripe > 3 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'stripe_missing',
      'severity', 'warning',
      'message', format('%s chauffeurs actifs sans Stripe', v_drivers_no_stripe)
    ));
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- Courses without payment
  IF v_courses_no_payment > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'courses_no_payment',
      'severity', 'warning',
      'message', format('%s courses terminées sans paiement (7j)', v_courses_no_payment)
    ));
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- NEW: QR codes orphaned
  IF v_qr_orphaned > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'qr_orphaned',
      'severity', 'warning',
      'message', format('%s QR codes actifs sans chauffeur valide', v_qr_orphaned)
    ));
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- NEW: Stripe payouts disabled
  IF v_stripe_no_payouts > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'stripe_no_payouts',
      'severity', 'warning',
      'message', format('%s chauffeurs actifs sans payouts Stripe', v_stripe_no_payouts)
    ));
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- NEW: Stripe details not submitted
  IF v_stripe_no_details > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'stripe_incomplete',
      'severity', 'warning',
      'message', format('%s chauffeurs avec Stripe incomplet (détails non soumis)', v_stripe_no_details)
    ));
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- NEW: Stripe abnormal status
  IF v_stripe_abnormal > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'stripe_abnormal',
      'severity', 'critical',
      'message', format('%s chauffeurs avec statut Stripe anormal', v_stripe_abnormal)
    ));
    v_status := 'critical';
  END IF;

  -- NEW: Funnel blockage (many stuck at documents)
  IF v_funnel_docs_rejected > 2 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'docs_rejected',
      'severity', 'warning',
      'message', format('%s dossiers documents rejetés (30j)', v_funnel_docs_rejected)
    ));
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- NEW: Stuck courses
  IF v_courses_stuck > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'courses_stuck',
      'severity', 'critical',
      'message', format('%s courses bloquées depuis +3h', v_courses_stuck)
    ));
    v_status := 'critical';
  END IF;

  -- NEW: Low conversion rate
  IF v_courses_completed_7d + v_courses_cancelled_7d > 5 AND v_conversion_rate_7d < 50 THEN
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'type', 'low_conversion',
      'severity', 'warning',
      'message', format('Taux conversion courses bas: %s%% (7j)', v_conversion_rate_7d)
    ));
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- Log the check
  INSERT INTO platform_health_logs (check_type, status, details, anomalies, triggered_by)
  VALUES ('full_check', v_status, v_result, v_anomalies, p_triggered_by);

  -- Create alerts for critical anomalies
  FOR i IN 0..(jsonb_array_length(v_anomalies) - 1) LOOP
    IF (v_anomalies->i->>'severity') = 'critical' THEN
      INSERT INTO platform_health_alerts (alert_type, severity, title, message, details)
      VALUES (
        v_anomalies->i->>'type',
        'critical',
        'Alerte critique détectée',
        v_anomalies->i->>'message',
        v_anomalies->i
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', v_status,
    'data', v_result,
    'anomalies', v_anomalies,
    'checked_at', now()
  );
END;
$$;
