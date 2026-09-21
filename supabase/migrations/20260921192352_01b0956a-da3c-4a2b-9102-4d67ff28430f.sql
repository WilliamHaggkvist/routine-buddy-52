CREATE TABLE public.reminder_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, day)
);

GRANT SELECT ON public.reminder_sends TO authenticated;
GRANT ALL ON public.reminder_sends TO service_role;

ALTER TABLE public.reminder_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own reminder sends" ON public.reminder_sends
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz not null default now();
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key ON public.push_subscriptions (endpoint);

ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_address text;