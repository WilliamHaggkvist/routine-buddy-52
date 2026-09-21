-- lovable-cron-fallback-reviewed: tidsbaserade påminnelser måste skickas på användarens valda klockslag; 15 min ger max 15 min fördröjning
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('dagsform-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dagsform-reminders'
);

SELECT cron.schedule(
  'dagsform-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--1a52bf89-3a57-4f4c-9bcc-370f5d46a600.lovable.app/api/public/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '80ac99a1cb983ccbbf8b1fdcf1b6c060b2eff0ed16314549'
    ),
    body := '{}'::jsonb
  );
  $$
);