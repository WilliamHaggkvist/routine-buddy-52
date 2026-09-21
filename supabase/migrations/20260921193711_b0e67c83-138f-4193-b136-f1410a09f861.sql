ALTER TABLE public.profiles DROP COLUMN IF EXISTS points;
ALTER TABLE public.daily_summary DROP COLUMN IF EXISTS points;
ALTER TABLE public.notification_settings DROP COLUMN IF EXISTS email_enabled;
ALTER TABLE public.notification_settings DROP COLUMN IF EXISTS email_address;