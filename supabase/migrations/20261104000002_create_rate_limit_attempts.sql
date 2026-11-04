-- Rollback:
-- DROP FUNCTION IF EXISTS public.cleanup_rate_limit_attempts();
-- DROP INDEX IF EXISTS public.idx_rate_limit_attempts_ip_endpoint_created;
-- DROP TABLE IF EXISTS public.rate_limit_attempts;

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_ip_endpoint_created
  ON public.rate_limit_attempts (ip_hash, endpoint, created_at DESC);

DROP POLICY IF EXISTS "rate_limit_select" ON public.rate_limit_attempts;
DROP POLICY IF EXISTS "rate_limit_insert" ON public.rate_limit_attempts;
DROP POLICY IF EXISTS "rate_limit_delete" ON public.rate_limit_attempts;

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limit_attempts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < now() - interval '1 hour';
$$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limit_attempts() FROM PUBLIC, anon, authenticated;

COMMIT;
