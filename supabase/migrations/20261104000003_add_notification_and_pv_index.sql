-- Partial index to accelerate 7-day visitor analytics queries on rate_limit_attempts
CREATE INDEX IF NOT EXISTS idx_rate_limit_pv_created_at
  ON public.rate_limit_attempts (created_at DESC)
  WHERE endpoint LIKE 'pv:%';

-- Optional notified_at column on profiles for explicit notification timestamp audit
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;
