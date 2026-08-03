-- Security hardening: brute-force rate limiting support for edge functions.
-- The security_events table records failed admin-login attempts (and can hold
-- other security events later). It is only ever read/written with the service
-- role key inside edge functions — no client access.

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_lookup_idx
  ON public.security_events (scope, key, created_at);

-- Lock the table down completely for anon/authenticated roles.
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_events FROM anon, authenticated;

-- Housekeeping: remove events older than 24h whenever new ones are inserted
-- (cheap trigger-based cleanup, avoids needing pg_cron).
CREATE OR REPLACE FUNCTION public.security_events_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.security_events WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS security_events_cleanup_trigger ON public.security_events;
CREATE TRIGGER security_events_cleanup_trigger
  AFTER INSERT ON public.security_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.security_events_cleanup();
