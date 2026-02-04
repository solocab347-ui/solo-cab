-- Create cron job to send daily reports every morning at 7:00 AM (Paris time)
SELECT cron.schedule(
  'send-daily-activity-reports',
  '0 6 * * *', -- 6:00 UTC = 7:00 Paris
  $$
  SELECT net.http_post(
    url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/send-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);