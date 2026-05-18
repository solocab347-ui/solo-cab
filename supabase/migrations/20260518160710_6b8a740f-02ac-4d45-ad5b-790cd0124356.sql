
-- 1. Reduce retention: cron.job_run_details 7d -> 24h
SELECT cron.unschedule('purge-cron-job-run-details-daily');
SELECT cron.schedule(
  'purge-cron-job-run-details-daily',
  '0 4 * * *',
  $$ DELETE FROM cron.job_run_details WHERE end_time < now() - interval '24 hours'; $$
);

-- 2. Reduce retention: net._http_response 3d -> 6h
SELECT cron.unschedule('purge-net-http-response-daily');
SELECT cron.schedule(
  'purge-net-http-response-daily',
  '15 4 * * *',
  $$ DELETE FROM net._http_response WHERE created < now() - interval '6 hours'; $$
);

-- 3. New purge: realtime_health_log retention 48h
SELECT cron.schedule(
  'purge-realtime-health-log-daily',
  '30 4 * * *',
  $$ DELETE FROM public.realtime_health_log WHERE created_at < now() - interval '48 hours'; $$
);

-- 4. Immediate purge to reclaim ~1.7 GB now
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '24 hours';
DELETE FROM net._http_response WHERE created < now() - interval '6 hours';
DELETE FROM public.realtime_health_log WHERE created_at < now() - interval '48 hours';
