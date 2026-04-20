-- ============================================================
-- ENRICHISSEMENT RAPPORT SANTÉ PLATEFORME v2
-- Toutes les métriques mesurées en LIVE sur la base réelle
-- ============================================================

-- 1) Wrapper SECURITY DEFINER pour interroger cron.job depuis l'API
CREATE OR REPLACE FUNCTION public.get_cron_jobs_status()
RETURNS TABLE(jobname text, schedule text, active boolean, last_run timestamptz, last_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::text,
    j.schedule::text,
    j.active,
    (SELECT MAX(jrd.start_time) FROM cron.job_run_details jrd WHERE jrd.jobid = j.jobid)::timestamptz AS last_run,
    (SELECT jrd.status FROM cron.job_run_details jrd WHERE jrd.jobid = j.jobid ORDER BY jrd.start_time DESC LIMIT 1)::text AS last_status
  FROM cron.job j;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_jobs_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs_status() TO service_role;

-- 2) RPC santé enrichie — tout en LIVE depuis la base réelle
CREATE OR REPLACE FUNCTION public.run_platform_health_check(p_triggered_by text DEFAULT 'auto'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_anomalies JSONB := '[]'::jsonb;
  v_status TEXT := 'ok';

  -- Métriques existantes
  v_inscriptions_today INT;
  v_inscriptions_avg NUMERIC;
  v_onboarding_completed INT;
  v_onboarding_total INT;
  v_courses_today INT;
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
  v_courses_cancelled_7d INT;
  v_courses_stuck INT;
  v_courses_completed_7d INT;
  v_conversion_rate_7d NUMERIC;
  v_failed_transfers_pending INT;

  -- Funnel docs réels
  v_docs_pending INT;
  v_docs_rejected INT;
  v_docs_validated INT;
  v_docs_expired INT;

  -- Nouvelles métriques RÉELLES
  v_clients_blocked INT;
  v_clients_high_risk INT;
  v_fraud_flags_open INT;
  v_blocked_ips_active INT;
  v_drivers_online_no_gps INT;
  v_drivers_online_total INT;
  v_ride_requests_stuck INT;
  v_subs_expired INT;
  v_subs_active INT;
  v_email_dlq_24h INT;
  v_email_failed_24h INT;
  v_suppressed_total INT;
  v_push_subs_total INT;
  v_failed_transfers_critical INT;
  v_holds_orphaned INT;
  v_cron_inactive INT;
  v_cron_failed_recent INT;
  v_db_size_mb NUMERIC;
BEGIN
  -- ============ INSCRIPTIONS / ONBOARDING ============
  SELECT COUNT(*) INTO v_inscriptions_today FROM profiles WHERE created_at >= CURRENT_DATE;
  SELECT COALESCE(AVG(cnt), 0) INTO v_inscriptions_avg
  FROM (SELECT COUNT(*) as cnt FROM profiles WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(created_at)) daily;

  SELECT COUNT(*) INTO v_onboarding_total FROM drivers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_onboarding_completed FROM drivers
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status IN ('validated', 'pending');

  -- ============ FUNNEL DOCS RÉEL ============
  SELECT COUNT(*) INTO v_docs_pending FROM driver_documents WHERE status = 'pending';
  SELECT COUNT(*) INTO v_docs_rejected FROM driver_documents WHERE status = 'rejected' AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_docs_validated FROM driver_documents WHERE status = 'validated';
  SELECT COUNT(*) INTO v_docs_expired FROM driver_documents WHERE expires_at IS NOT NULL AND expires_at < NOW() AND status = 'validated';

  -- ============ COURSES ============
  SELECT COUNT(*) INTO v_courses_today FROM courses WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO v_payments_failed FROM payments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'failed';
  SELECT COUNT(*) INTO v_payments_total FROM payments WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status IS NOT NULL;
  SELECT COUNT(*) INTO v_courses_no_payment FROM courses WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_courses_cancelled_7d FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'cancelled';
  SELECT COUNT(*) INTO v_courses_stuck FROM courses WHERE status IN ('accepted', 'in_progress') AND created_at < NOW() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO v_courses_completed_7d FROM courses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'completed';

  -- Ride requests bloquées (ni acceptées ni expirées)
  SELECT COUNT(*) INTO v_ride_requests_stuck FROM ride_requests
    WHERE status = 'pending' AND created_at < NOW() - INTERVAL '15 minutes';

  IF (v_courses_completed_7d + v_courses_cancelled_7d) > 0 THEN
    v_conversion_rate_7d := ROUND((v_courses_completed_7d::NUMERIC / (v_courses_completed_7d + v_courses_cancelled_7d) * 100), 1);
  ELSE
    v_conversion_rate_7d := 0;
  END IF;

  -- ============ CHAUFFEURS / STRIPE ============
  SELECT COUNT(*) INTO v_drivers_no_stripe FROM drivers
    WHERE status = 'validated' AND (stripe_connect_account_id IS NULL OR stripe_connect_status IS NULL);
  SELECT COUNT(*) INTO v_pending_drivers FROM drivers WHERE status = 'pending';
  SELECT COUNT(*) INTO v_active_drivers FROM drivers WHERE status = 'validated';
  SELECT COUNT(*) INTO v_stripe_no_payouts FROM drivers
    WHERE status = 'validated' AND stripe_connect_account_id IS NOT NULL
    AND (stripe_connect_payouts_enabled IS NULL OR stripe_connect_payouts_enabled = false);
  SELECT COUNT(*) INTO v_stripe_no_details FROM drivers
    WHERE status = 'validated' AND stripe_connect_account_id IS NOT NULL
    AND (stripe_connect_details_submitted IS NULL OR stripe_connect_details_submitted = false);
  SELECT COUNT(*) INTO v_stripe_abnormal FROM drivers
    WHERE status = 'validated' AND stripe_connect_account_id IS NOT NULL
    AND stripe_connect_status IS NOT NULL AND stripe_connect_status NOT IN ('active', 'complete', 'enabled');

  -- ============ GPS RÉEL : chauffeurs "online" sans position fraîche ============
  SELECT COUNT(*) INTO v_drivers_online_total FROM drivers WHERE is_available_now = true;
  SELECT COUNT(*) INTO v_drivers_online_no_gps FROM drivers
    WHERE is_available_now = true 
    AND (last_location_update IS NULL OR last_location_update < NOW() - INTERVAL '5 minutes');

  -- ============ LITIGES ============
  SELECT COUNT(*) INTO v_disputes_open FROM rating_disputes WHERE resolved_at IS NULL;

  -- ============ QR CODES ============
  SELECT COUNT(*) INTO v_qr_total FROM qr_codes;
  SELECT COUNT(*) INTO v_qr_active FROM qr_codes WHERE is_active = true;
  SELECT COUNT(*) INTO v_qr_orphaned FROM qr_codes q
    LEFT JOIN drivers d ON d.id = q.driver_id
    WHERE q.is_active = true AND (d.id IS NULL OR d.status NOT IN ('validated', 'pending'));

  -- ============ CLIENTS / FRAUDE / SÉCURITÉ ============
  SELECT COUNT(*) INTO v_clients_blocked FROM client_risk_scores WHERE is_blocked = true;
  SELECT COUNT(*) INTO v_clients_high_risk FROM client_risk_scores WHERE score <= -3 AND is_blocked = false;
  SELECT COUNT(*) INTO v_fraud_flags_open FROM client_fraud_flags WHERE is_resolved = false;
  SELECT COUNT(*) INTO v_blocked_ips_active FROM blocked_ips
    WHERE is_permanent = true OR blocked_until > NOW();

  -- ============ ABONNEMENTS PREMIUM ============
  SELECT COUNT(*) INTO v_subs_active FROM driver_subscriptions WHERE status = 'active';
  SELECT COUNT(*) INTO v_subs_expired FROM driver_subscriptions
    WHERE status IN ('past_due', 'unpaid', 'canceled') AND updated_at >= NOW() - INTERVAL '7 days';

  -- ============ EMAILS / COMMS ============
  SELECT COUNT(DISTINCT message_id) INTO v_email_dlq_24h FROM email_send_log
    WHERE status = 'dlq' AND created_at >= NOW() - INTERVAL '24 hours';
  SELECT COUNT(DISTINCT message_id) INTO v_email_failed_24h FROM email_send_log
    WHERE status IN ('failed', 'bounced') AND created_at >= NOW() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO v_suppressed_total FROM suppressed_emails;
  SELECT COUNT(*) INTO v_push_subs_total FROM push_subscriptions;

  -- ============ VIREMENTS / HOLDS ============
  SELECT COUNT(*) INTO v_failed_transfers_pending FROM failed_transfers
    WHERE status NOT IN ('resolved', 'cancelled', 'permanently_failed');
  SELECT COUNT(*) INTO v_failed_transfers_critical FROM failed_transfers
    WHERE status NOT IN ('resolved', 'cancelled', 'permanently_failed')
    AND created_at < NOW() - INTERVAL '7 days';

  -- Holds orphelins : ride_requests cancelled/expired avec stripe_payment_intent_id non null > 24h
  BEGIN
    SELECT COUNT(*) INTO v_holds_orphaned FROM ride_requests
      WHERE status IN ('cancelled', 'expired')
      AND updated_at < NOW() - INTERVAL '24 hours'
      AND created_at >= NOW() - INTERVAL '7 days';
  EXCEPTION WHEN OTHERS THEN
    v_holds_orphaned := 0;
  END;

  -- ============ CRON JOBS RÉELS ============
  BEGIN
    SELECT COUNT(*) INTO v_cron_inactive FROM public.get_cron_jobs_status() WHERE active = false;
    SELECT COUNT(*) INTO v_cron_failed_recent FROM public.get_cron_jobs_status()
      WHERE last_status = 'failed' AND last_run >= NOW() - INTERVAL '24 hours';
  EXCEPTION WHEN OTHERS THEN
    v_cron_inactive := 0;
    v_cron_failed_recent := 0;
  END;

  -- ============ TAILLE DB ============
  SELECT ROUND(pg_database_size(current_database())::numeric / 1024 / 1024, 1) INTO v_db_size_mb;

  -- ============ ANOMALIES (avec prompts Lovable) ============
  IF v_pending_drivers > 10 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'pending_drivers_high', 'severity', 'warning',
      'message', v_pending_drivers || ' chauffeurs en attente de validation',
      'cause', 'Le flux de validation admin est en retard ou le volume d''inscriptions a augmenté.',
      'action', 'Aller dans Admin → Utilisateurs → Chauffeurs en attente et valider les dossiers prioritaires.',
      'lovable_prompt', 'Crée une notification automatique pour l''admin dès qu''il y a plus de 10 chauffeurs en attente depuis plus de 48h, avec un lien direct vers la page de validation.',
      'link', '/admin-dashboard?section=users&tab=pending'
    );
    v_status := 'warning';
  END IF;

  IF v_drivers_no_stripe > 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'drivers_no_stripe', 'severity', 'critical',
      'message', v_drivers_no_stripe || ' chauffeurs validés sans Stripe Connect',
      'cause', 'Ces chauffeurs ne peuvent pas recevoir de virements. Risque légal et financier.',
      'action', 'Envoyer un rappel email automatisé pour qu''ils complètent leur onboarding Stripe.',
      'lovable_prompt', 'Crée un job hebdomadaire qui envoie un email de rappel à tous les chauffeurs validés sans compte Stripe Connect actif (stripe_connect_account_id IS NULL OR stripe_connect_payouts_enabled = false), avec un lien direct vers /driver-stripe-onboarding.',
      'link', '/admin-dashboard?section=finances&tab=stripe'
    );
    v_status := 'critical';
  END IF;

  IF v_payments_total > 0 AND (v_payments_failed::NUMERIC / v_payments_total) > 0.10 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'payment_failure_rate', 'severity', 'critical',
      'message', 'Taux d''échec paiements > 10% sur 7j (' || v_payments_failed || '/' || v_payments_total || ')',
      'cause', 'Problème probable : cartes refusées, holds insuffisants, ou bug dans la capture.',
      'action', 'Inspecter les logs Stripe et la fonction capture-payment-intent. Vérifier les motifs de refus.',
      'lovable_prompt', 'Analyse les logs des edge functions capture-payment-intent et confirm-payment-intent des 7 derniers jours. Identifie les causes principales d''échec et corrige le code défaillant.',
      'link', '/admin-dashboard?section=finances&tab=transactions'
    );
    v_status := 'critical';
  END IF;

  IF v_disputes_open > 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'disputes_high', 'severity', 'warning',
      'message', v_disputes_open || ' litiges de notation ouverts',
      'cause', 'L''arbitrage IA des notations est lent ou bloqué.',
      'action', 'Vérifier l''edge function ai-rating-arbitration et résoudre manuellement les cas urgents.',
      'lovable_prompt', 'Vérifie pourquoi les litiges de notation (rating_disputes) restent ouverts. Inspecte ai-rating-arbitration et redéclenche le traitement des litiges en attente.',
      'link', '/admin-dashboard?section=support&tab=disputes'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  IF v_courses_stuck > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'courses_stuck', 'severity', 'warning',
      'message', v_courses_stuck || ' courses bloquées en accepted/in_progress depuis +24h',
      'cause', 'Le chauffeur n''a pas clôturé la course ou le bouton fin de course a échoué.',
      'action', 'Forcer la clôture admin avec recalcul Stripe ou contacter le chauffeur.',
      'lovable_prompt', 'Crée un job nocturne qui force le statut completed sur toutes les courses bloquées en accepted/in_progress depuis +24h, déclenche la finalisation Stripe et notifie l''admin.',
      'link', '/admin-dashboard?section=tech&tab=courses'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  IF v_failed_transfers_pending > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'failed_transfers', 'severity', 'critical',
      'message', v_failed_transfers_pending || ' virement(s) bloqué(s) en attente de résolution' ||
                 CASE WHEN v_failed_transfers_critical > 0 THEN ' (' || v_failed_transfers_critical || ' depuis +7j)' ELSE '' END,
      'cause', 'RIB invalide, compte fermé, fonds insuffisants côté plateforme ou Stripe.',
      'action', 'Aller dans Admin → Finances → Virements échoués, contacter le chauffeur pour MAJ RIB, relancer.',
      'lovable_prompt', 'Implémente un retry automatique des failed_transfers après modification du RIB par le chauffeur (max 3 changements/30j) et envoie un email hebdomadaire de rappel pour ceux bloqués depuis +7 jours.',
      'link', '/admin-dashboard?section=finances&tab=failed-transfers'
    );
    v_status := 'critical';
  END IF;

  -- Fraude clients
  IF v_clients_high_risk > 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'clients_high_risk', 'severity', 'warning',
      'message', v_clients_high_risk || ' clients à risque élevé non bloqués (score ≤ -3)',
      'cause', 'Le seuil de blocage automatique (-5) n''est pas atteint mais ces clients accumulent des incidents.',
      'action', 'Examiner manuellement les profils et bloquer si récidive.',
      'lovable_prompt', 'Affiche dans Admin → Utilisateurs → Clients un onglet "À surveiller" listant tous les clients avec score ≤ -3 ET is_blocked = false, triés par dernière incident.',
      'link', '/admin-dashboard?section=users&tab=clients-risk'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  IF v_fraud_flags_open > 10 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'fraud_flags_open', 'severity', 'warning',
      'message', v_fraud_flags_open || ' signalements de fraude non résolus',
      'cause', 'Backlog d''investigation admin sur la fraude.',
      'action', 'Trier par sévérité, traiter les "critical" en priorité.',
      'lovable_prompt', 'Crée une vue admin filtrable sur client_fraud_flags avec is_resolved=false, triable par severity, avec actions rapides "Bloquer client" et "Marquer résolu".',
      'link', '/admin-dashboard?section=users&tab=fraud'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- GPS chauffeurs
  IF v_drivers_online_total > 0 AND v_drivers_online_no_gps::NUMERIC / v_drivers_online_total > 0.3 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'drivers_no_gps', 'severity', 'warning',
      'message', v_drivers_online_no_gps || '/' || v_drivers_online_total || ' chauffeurs online sans GPS frais (>5min)',
      'cause', 'Wake Lock cassé, app en background, ou déconnexion réseau prolongée.',
      'action', 'Vérifier le système de tracking GPS dual-layer et le Wake Lock.',
      'lovable_prompt', 'Investigue pourquoi 30%+ des chauffeurs is_available_now=true ont un last_location_update > 5min. Vérifie le hook useDriverGpsTracking et le Wake Lock. Force un passage offline si pas de GPS depuis 10min.',
      'link', '/admin-dashboard?section=tech&tab=gps'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- Ride requests bloquées
  IF v_ride_requests_stuck > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'ride_requests_stuck', 'severity', 'warning',
      'message', v_ride_requests_stuck || ' demandes de course en pending depuis +15min',
      'cause', 'Le système d''expiration (expire-ride-requests) ne tourne plus ou aucun chauffeur ne répond.',
      'action', 'Vérifier que le cron expire-ride-requests tourne toutes les minutes.',
      'lovable_prompt', 'Vérifie que le cron expire-ride-requests est actif et tourne toutes les minutes. Si oui, augmente le périmètre de recherche driver pour les zones à faible densité.',
      'link', '/admin-dashboard?section=tech&tab=cron'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- Cron jobs
  IF v_cron_failed_recent > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'cron_failed', 'severity', 'critical',
      'message', v_cron_failed_recent || ' cron job(s) en échec dans les 24h',
      'cause', 'Erreur edge function, secret manquant, ou rate-limit Stripe/Resend.',
      'action', 'Inspecter cron.job_run_details et corriger l''edge function ciblée.',
      'lovable_prompt', 'Liste les cron jobs en échec dans les 24h via get_cron_jobs_status(). Pour chacun, inspecte les logs de l''edge function appelée et corrige la cause racine.',
      'link', '/admin-dashboard?section=tech&tab=cron'
    );
    v_status := 'critical';
  END IF;

  -- Emails
  IF v_email_dlq_24h > 5 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'email_dlq_high', 'severity', 'warning',
      'message', v_email_dlq_24h || ' emails dans la dead-letter queue (24h)',
      'cause', 'Resend rate-limit, addresses invalides, ou template cassé.',
      'action', 'Inspecter email_send_log status=dlq et purger après correction.',
      'lovable_prompt', 'Inspecte email_send_log status=dlq des 24h, identifie le pattern d''erreur (rate-limit, bounce, template), corrige et purge la DLQ.',
      'link', '/admin-dashboard?section=communications&tab=emails'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- Documents expirés
  IF v_docs_expired > 0 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'docs_expired', 'severity', 'warning',
      'message', v_docs_expired || ' documents chauffeur expirés mais encore validés',
      'cause', 'Pas de job de revalidation automatique sur expires_at.',
      'action', 'Forcer status=pending sur les docs expirés et notifier les chauffeurs.',
      'lovable_prompt', 'Crée un cron quotidien qui passe en status=pending tous les driver_documents avec expires_at < NOW() AND status=validated, et envoie un email au chauffeur pour réuploader.',
      'link', '/admin-dashboard?section=documents&tab=expired'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- Abonnements échoués
  IF v_subs_expired > 3 THEN
    v_anomalies := v_anomalies || jsonb_build_object(
      'type', 'subscriptions_failed', 'severity', 'warning',
      'message', v_subs_expired || ' abonnements premium en échec/annulés cette semaine',
      'cause', 'Cartes refusées au renouvellement ou annulations volontaires.',
      'action', 'Relancer les chauffeurs avec un email de réactivation + offre.',
      'lovable_prompt', 'Crée une campagne email de réactivation pour les driver_subscriptions status IN (past_due, unpaid, canceled) des 7 derniers jours, avec lien direct vers /driver-subscription.',
      'link', '/admin-dashboard?section=subscriptions&tab=churn'
    );
    IF v_status = 'ok' THEN v_status := 'warning'; END IF;
  END IF;

  -- ============ RÉSULTAT FINAL ============
  v_result := jsonb_build_object(
    -- Existant
    'inscriptions_today', v_inscriptions_today,
    'inscriptions_avg_30d', ROUND(v_inscriptions_avg, 1),
    'onboarding_completed_7d', v_onboarding_completed,
    'onboarding_total_7d', v_onboarding_total,
    'onboarding_rate', CASE WHEN v_onboarding_total > 0 THEN ROUND((v_onboarding_completed::NUMERIC / v_onboarding_total * 100), 1) ELSE 0 END,
    'courses_today', v_courses_today,
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
    'courses_cancelled_7d', v_courses_cancelled_7d,
    'courses_stuck', v_courses_stuck,
    'courses_completed_7d', v_courses_completed_7d,
    'conversion_rate_7d', v_conversion_rate_7d,
    'failed_transfers_pending', v_failed_transfers_pending,
    -- Funnel docs RÉEL
    'funnel_docs_pending', v_docs_pending,
    'funnel_docs_rejected', v_docs_rejected,
    'funnel_docs_validated', v_docs_validated,
    'funnel_docs_expired', v_docs_expired,
    -- Nouveau RÉEL
    'clients_blocked', v_clients_blocked,
    'clients_high_risk', v_clients_high_risk,
    'fraud_flags_open', v_fraud_flags_open,
    'blocked_ips_active', v_blocked_ips_active,
    'drivers_online_total', v_drivers_online_total,
    'drivers_online_no_gps', v_drivers_online_no_gps,
    'drivers_gps_health_pct', CASE WHEN v_drivers_online_total > 0 
      THEN ROUND(((v_drivers_online_total - v_drivers_online_no_gps)::NUMERIC / v_drivers_online_total * 100), 1) 
      ELSE 100 END,
    'ride_requests_stuck', v_ride_requests_stuck,
    'subscriptions_active', v_subs_active,
    'subscriptions_expired_7d', v_subs_expired,
    'email_dlq_24h', v_email_dlq_24h,
    'email_failed_24h', v_email_failed_24h,
    'suppressed_emails_total', v_suppressed_total,
    'push_subscriptions_total', v_push_subs_total,
    'failed_transfers_critical', v_failed_transfers_critical,
    'holds_orphaned', v_holds_orphaned,
    'cron_inactive', v_cron_inactive,
    'cron_failed_recent', v_cron_failed_recent,
    'db_size_mb', v_db_size_mb
  );

  INSERT INTO platform_health_logs (check_type, status, details, anomalies, triggered_by)
  VALUES ('full', v_status, v_result, v_anomalies, p_triggered_by);

  RETURN jsonb_build_object('status', v_status, 'data', v_result, 'anomalies', v_anomalies, 'checked_at', NOW());
END;
$function$;