
-- 1. Ralentir process-email-queue : 5s → 30s
SELECT cron.alter_job(13, schedule := '30 seconds');

-- 2. Ralentir GPS stale : 1min → 3min
SELECT cron.alter_job(23, schedule := '*/3 * * * *');

-- 3. Ralentir expire-ride-requests : 1min → 3min
SELECT cron.alter_job(12, schedule := '*/3 * * * *');

-- 4. Ralentir reconcile-stale-drivers : 2min → 5min
SELECT cron.alter_job(22, schedule := '*/5 * * * *');

-- 5. Purge quotidienne cron.job_run_details > 7 jours
SELECT cron.schedule(
  'purge-cron-job-run-details-daily',
  '0 4 * * *',
  $$ DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'; $$
);

-- 6. Purge quotidienne net._http_response > 3 jours
SELECT cron.schedule(
  'purge-net-http-response-daily',
  '15 4 * * *',
  $$ DELETE FROM net._http_response WHERE created < now() - interval '3 days'; $$
);
