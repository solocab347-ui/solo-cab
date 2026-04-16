
-- Platform health monitoring logs
CREATE TABLE public.platform_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  details JSONB DEFAULT '{}'::jsonb,
  anomalies JSONB DEFAULT '[]'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read health logs"
ON public.platform_health_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert health logs"
ON public.platform_health_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platform health alerts
CREATE TABLE public.platform_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read alerts"
ON public.platform_health_alerts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage alerts"
ON public.platform_health_alerts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert alerts"
ON public.platform_health_alerts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RPC for health check (runs server-side checks)
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
    'disputes_open', v_disputes_open
  );

  -- Detect anomalies
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
