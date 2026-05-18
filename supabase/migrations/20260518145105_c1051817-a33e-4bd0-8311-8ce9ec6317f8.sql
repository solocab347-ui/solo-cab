CREATE OR REPLACE FUNCTION public.get_cloud_cost_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, net
AS $$
DECLARE
  result jsonb;
  v_jobs jsonb;
  v_runs_1h jsonb;
  v_runs_24h jsonb;
  v_runs_7d jsonb;
  v_top_jobs jsonb;
  v_alerts jsonb;
  v_totals jsonb;
  v_http_recent bigint;
  v_http_errors_24h bigint;
BEGIN
  -- Admin guard
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Jobs list
  SELECT jsonb_agg(jsonb_build_object(
    'jobid', jobid,
    'jobname', jobname,
    'schedule', schedule,
    'active', active,
    'command', LEFT(command, 200)
  ) ORDER BY jobid)
  INTO v_jobs
  FROM cron.job;

  -- Run counts per job (1h, 24h, 7d)
  SELECT jsonb_object_agg(jobid::text, c)
  INTO v_runs_1h
  FROM (
    SELECT jobid, COUNT(*) c
    FROM cron.job_run_details
    WHERE start_time > now() - interval '1 hour'
    GROUP BY jobid
  ) s;

  SELECT jsonb_object_agg(jobid::text, c)
  INTO v_runs_24h
  FROM (
    SELECT jobid, COUNT(*) c
    FROM cron.job_run_details
    WHERE start_time > now() - interval '24 hours'
    GROUP BY jobid
  ) s;

  SELECT jsonb_object_agg(jobid::text, c)
  INTO v_runs_7d
  FROM (
    SELECT jobid, COUNT(*) c
    FROM cron.job_run_details
    WHERE start_time > now() - interval '7 days'
    GROUP BY jobid
  ) s;

  -- Top 10 noisiest jobs (24h)
  SELECT jsonb_agg(x)
  INTO v_top_jobs
  FROM (
    SELECT jrd.jobid,
           j.jobname,
           j.schedule,
           COUNT(*) AS runs_24h,
           SUM(CASE WHEN jrd.status = 'failed' THEN 1 ELSE 0 END) AS failures_24h,
           ROUND(AVG(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) * 1000)::numeric, 1) AS avg_ms
    FROM cron.job_run_details jrd
    LEFT JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE jrd.start_time > now() - interval '24 hours'
    GROUP BY jrd.jobid, j.jobname, j.schedule
    ORDER BY runs_24h DESC
    LIMIT 10
  ) x;

  -- Alerts (thresholds)
  SELECT jsonb_agg(jsonb_build_object(
    'jobid', jobid,
    'jobname', jobname,
    'severity', severity,
    'message', message,
    'runs_24h', runs_24h
  ))
  INTO v_alerts
  FROM (
    SELECT j.jobid, j.jobname, COUNT(jrd.*) AS runs_24h,
      CASE
        WHEN COUNT(jrd.*) > 50000 THEN 'critical'
        WHEN COUNT(jrd.*) > 10000 THEN 'high'
        WHEN COUNT(jrd.*) > 2000  THEN 'medium'
      END AS severity,
      CASE
        WHEN COUNT(jrd.*) > 50000 THEN 'Tâche extrêmement fréquente: '||COUNT(jrd.*)||' exécutions / 24h'
        WHEN COUNT(jrd.*) > 10000 THEN 'Tâche très fréquente: '||COUNT(jrd.*)||' exécutions / 24h'
        WHEN COUNT(jrd.*) > 2000  THEN 'Tâche fréquente: '||COUNT(jrd.*)||' exécutions / 24h'
      END AS message
    FROM cron.job j
    LEFT JOIN cron.job_run_details jrd
      ON jrd.jobid = j.jobid AND jrd.start_time > now() - interval '24 hours'
    WHERE j.active
    GROUP BY j.jobid, j.jobname
    HAVING COUNT(jrd.*) > 2000
    ORDER BY COUNT(jrd.*) DESC
  ) a;

  -- Failures alert (last 1h)
  WITH fails AS (
    SELECT j.jobid, j.jobname, COUNT(*) AS f
    FROM cron.job_run_details jrd
    JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE jrd.status = 'failed' AND jrd.start_time > now() - interval '1 hour'
    GROUP BY j.jobid, j.jobname
    HAVING COUNT(*) >= 3
  )
  SELECT COALESCE(v_alerts, '[]'::jsonb) || COALESCE(jsonb_agg(jsonb_build_object(
    'jobid', jobid,
    'jobname', jobname,
    'severity', 'high',
    'message', f||' échecs sur la dernière heure',
    'runs_24h', 0
  )), '[]'::jsonb)
  INTO v_alerts
  FROM fails;

  -- HTTP totals
  SELECT COUNT(*) INTO v_http_recent
  FROM net._http_response
  WHERE created > now() - interval '1 hour';

  SELECT COUNT(*) INTO v_http_errors_24h
  FROM net._http_response
  WHERE created > now() - interval '24 hours'
    AND (status_code >= 400 OR timed_out = true OR error_msg IS NOT NULL);

  -- Global totals + monthly projection
  SELECT jsonb_build_object(
    'total_runs_1h', COALESCE((SELECT COUNT(*) FROM cron.job_run_details WHERE start_time > now() - interval '1 hour'), 0),
    'total_runs_24h', COALESCE((SELECT COUNT(*) FROM cron.job_run_details WHERE start_time > now() - interval '24 hours'), 0),
    'total_runs_7d',  COALESCE((SELECT COUNT(*) FROM cron.job_run_details WHERE start_time > now() - interval '7 days'), 0),
    'projected_monthly', COALESCE((SELECT COUNT(*) FROM cron.job_run_details WHERE start_time > now() - interval '24 hours'), 0) * 30,
    'http_calls_1h', v_http_recent,
    'http_errors_24h', v_http_errors_24h,
    'active_jobs', (SELECT COUNT(*) FROM cron.job WHERE active),
    'total_jobs',  (SELECT COUNT(*) FROM cron.job)
  ) INTO v_totals;

  result := jsonb_build_object(
    'generated_at', now(),
    'totals', v_totals,
    'jobs', COALESCE(v_jobs, '[]'::jsonb),
    'runs_1h', COALESCE(v_runs_1h, '{}'::jsonb),
    'runs_24h', COALESCE(v_runs_24h, '{}'::jsonb),
    'runs_7d', COALESCE(v_runs_7d, '{}'::jsonb),
    'top_jobs', COALESCE(v_top_jobs, '[]'::jsonb),
    'alerts', COALESCE(v_alerts, '[]'::jsonb)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cloud_cost_metrics() TO authenticated;