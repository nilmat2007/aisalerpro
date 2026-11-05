-- =============================================================================
-- Migration: 20261105000001_course_bundle_rpcs.sql
-- Purpose: Add 2 Bonus AI Flow Tools (puppap-fashion-studio, puppap-ugc-product)
--          + Atomic Course Bundle Promotion RPCs (v18 Final Production-Grade)
-- Note on Filename Year (20261105): Intentional monotonic lexicographical
--          ordering following existing 20261104000001..20261104000003 migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 Pre-Flight Verification (orders.approved_at, approved_by, admin_note)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'approved_at'
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: public.orders.approved_at column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'approved_by'
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: public.orders.approved_by column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'admin_note'
      AND (
        data_type = 'text'
        OR (data_type = 'character varying' AND (character_maximum_length IS NULL OR character_maximum_length >= 500))
      )
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: public.orders.admin_note must exist as text or varchar(500+)';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1.2 Control & Forensic Tables (_system_maintenance, _migration_log, _audit)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._system_maintenance (
  key text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT false,
  reason text,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public._system_maintenance (key, is_enabled, reason, updated_by, updated_at)
VALUES ('maintenance_mode', false, 'Initial default state', 'migration:20261105000001_up', now())
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public._migration_log (
  migration_name text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('up', 'down')),
  first_run_id uuid NOT NULL DEFAULT gen_random_uuid(),
  last_run_id uuid NOT NULL DEFAULT gen_random_uuid(),
  pg_version text NOT NULL,
  fixed_rows_count integer NOT NULL DEFAULT 0,
  skipped_rows_count integer NOT NULL DEFAULT 0,
  run_count integer NOT NULL DEFAULT 1,
  last_request_id text,
  first_executed_at timestamptz NOT NULL DEFAULT now(),
  last_executed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (migration_name, direction)
);

ALTER TABLE public._migration_log
  ADD COLUMN IF NOT EXISTS skipped_rows_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public._migration_log.pg_version IS
  'Stores numeric server_version_num string from current_setting(''server_version_num''), e.g. ''150008'' for PostgreSQL 15.8 (not version() text)';
COMMENT ON COLUMN public._migration_log.fixed_rows_count IS
  'direction=up: cumulative rows inserted/activated across runs; direction=down: rows restored in latest rollback';
COMMENT ON COLUMN public._migration_log.skipped_rows_count IS
  'direction=up: rows already active needing no change in latest run; direction=down: rows protected/skipped by new-order guard in latest rollback';

CREATE TABLE IF NOT EXISTS public._migration_20261105_user_tools_audit (
  user_tool_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  tool_id uuid NOT NULL,
  previous_is_active boolean NOT NULL,
  snapshot_activated_at timestamptz,
  fixed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public._system_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._migration_20261105_user_tools_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_system_maintenance ON public._system_maintenance;
CREATE POLICY deny_all_system_maintenance ON public._system_maintenance FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_all_migration_log ON public._migration_log;
CREATE POLICY deny_all_migration_log ON public._migration_log FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_all_migration_audit ON public._migration_20261105_user_tools_audit;
CREATE POLICY deny_all_migration_audit ON public._migration_20261105_user_tools_audit FOR ALL TO public USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public._system_maintenance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public._migration_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public._migration_20261105_user_tools_audit FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1.3 Schema Columns, 4-Step Non-Default Backfills, Triggers & Indexes
-- -----------------------------------------------------------------------------
-- Ensure UNIQUE(user_id, tool_id) on public.user_tools
CREATE UNIQUE INDEX IF NOT EXISTS user_tools_user_id_tool_id_key
  ON public.user_tools (user_id, tool_id);

-- A) profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bundle_state_version bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_bundle_heal_at timestamptz,
  ADD COLUMN IF NOT EXISTS bundle_heal_fail_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundle_heal_window_start timestamptz,
  ADD COLUMN IF NOT EXISTS last_circuit_alert_at timestamptz;

-- B) user_trials.expires_at (4-step DDL avoiding PG 11+ fast-default pitfall)
ALTER TABLE public.user_trials
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.user_trials
SET expires_at = COALESCE(started_at, created_at, now()) + INTERVAL '7 days'
WHERE expires_at IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_trials WHERE expires_at IS NULL) THEN
    RAISE EXCEPTION 'BACKFILL_INCOMPLETE: user_trials.expires_at still contains NULL values';
  END IF;
END $$;

ALTER TABLE public.user_trials
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '7 days'),
  ALTER COLUMN expires_at SET NOT NULL;

-- C) orders columns (4-step DDL for updated_at + bundle tracking columns)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by_actor text,
  ADD COLUMN IF NOT EXISTS revoke_reason text CHECK (revoke_reason IN ('admin_revoke', 'refund', 'chargeback', 'duplicate_cancel')),
  ADD COLUMN IF NOT EXISTS kept_active_via_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grant_retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grant_retry_exhausted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_grant_error text;

UPDATE public.orders
SET updated_at = COALESCE(approved_at, created_at, now())
WHERE updated_at IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE updated_at IS NULL) THEN
    RAISE EXCEPTION 'BACKFILL_INCOMPLETE: orders.updated_at still contains NULL values';
  END IF;
END $$;

ALTER TABLE public.orders
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- Automatic BEFORE UPDATE trigger on public.orders (fires on UPDATE only, preserves INSERT values)
CREATE OR REPLACE FUNCTION public.tg_set_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON public.orders;
CREATE TRIGGER trg_orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_orders_updated_at();

-- D) 5 New Indexes (keeping pre-existing indexes intact)
CREATE INDEX IF NOT EXISTS idx_orders_license_key_active_pending
  ON public.orders (license_key_id, status)
  WHERE status IN ('approved', 'pending') AND license_key_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_approved_by_actor
  ON public.orders (approved_by_actor)
  WHERE approved_by_actor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_trials_expires_at_active
  ON public.user_trials (expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_license_keys_status_created_at
  ON public.license_keys (status, created_at);

CREATE INDEX IF NOT EXISTS idx_license_keys_activated_partial
  ON public.license_keys (activated_by, tool_id, activated_at)
  WHERE status = 'activated';

-- -----------------------------------------------------------------------------
-- 1.4 Upsert 2 New Bonus Flow Tools + Link Course Lessons 14 & 22
-- -----------------------------------------------------------------------------
INSERT INTO public.tools (
  name,
  slug,
  icon,
  poster_url,
  logo_url,
  password,
  description,
  price,
  badge_text,
  badge_color,
  version,
  is_active,
  is_coming_soon,
  sort_order,
  trial_enabled,
  flow_url,
  trial_flow_url,
  features
)
VALUES
  (
    'PUP PAP Fashion Studio',
    'puppap-fashion-studio',
    '👗',
    '/images/poster-puppap-fashion-studio.jpg',
    '/images/poster-puppap-fashion-studio.jpg',
    'LICENSE_KEY_ONLY',
    'สตูดิโอสร้างคลิปขายเสื้อผ้าและแฟชั่นทุกแบบด้วย AI ปั้นนางแบบ-นายแบบสวมชุดจริง รีวิวเสื้อผ้าปักตะกร้าอัตโนมัติ (ซื้อแยก ฿299 หรือรับฟรีทันทีเมื่อสมัครคอร์ส ฿299)',
    '299',
    '🎁 แถมฟรีในคอร์ส ฿299',
    'pink',
    '1.0.0',
    true,
    false,
    2,
    true,
    'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc',
    'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc',
    jsonb_build_object(
      'category', 'flow_tool',
      'original_price', '990',
      'bundle_with_course', 'tiktok-ai-affiliate',
      'guide_drive_url', 'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link',
      'highlights', jsonb_build_array(
        'สร้างคลิปนางแบบ-นายแบบใส่เสื้อผ้าของคุณได้ทุกสไตล์',
        'รองรับเสื้อยืด ชุดเดรส แฟชั่นสตรีท ชุดทำงาน และสินค้าแฟชั่นทุกแบบ',
        'แถมฟรีคู่มือและคลิปสอนใช้งานครบชุดใน Google Drive',
        'ปลดล็อกฟรีอัตโนมัติเมื่อซื้อคอร์สเรียนทำคลิป AI ปักตะกร้า ฿299'
      )
    )
  ),
  (
    'PUPPAP AI UGC Product',
    'puppap-ugc-product',
    '✨',
    '/images/poster-puppap-ugc-product.jpg',
    '/images/poster-puppap-ugc-product.jpg',
    'LICENSE_KEY_ONLY',
    'เครื่องมือสร้างคลิปรีวิวสินค้าแบบมินิมอล (Minimal UGC) คุมโทนสวยสะอาดตา น่าเชื่อถือ ปิดการขายปักตะกร้าได้ทุกหมวดสินค้า (ซื้อแยก ฿299 หรือรับฟรีทันทีเมื่อสมัครคอร์ส ฿299)',
    '299',
    '🎁 แถมฟรีในคอร์ส ฿299',
    'purple',
    '1.0.0',
    true,
    false,
    3,
    true,
    'https://flow.google.com/shared/tool/2cf7e3b4-9ea3-443a-b5d4-a32b6d7aed50',
    'https://flow.google.com/shared/tool/2cf7e3b4-9ea3-443a-b5d4-a32b6d7aed50',
    jsonb_build_object(
      'category', 'flow_tool',
      'original_price', '990',
      'bundle_with_course', 'tiktok-ai-affiliate',
      'guide_drive_url', 'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link',
      'highlights', jsonb_build_array(
        'สร้างคลิปรีวิวสินค้าสไตล์ Minimal UGC ดูจริงใจ ยอดวิวพุ่ง',
        'เหมาะกับสินค้าบิวตี้ ของใช้ในบ้าน แกตเจ็ต และสินค้าปักตะกร้าทุกหมวด',
        'แถมฟรีคู่มือและคลิปสอนใช้งานครบชุดใน Google Drive',
        'ปลดล็อกฟรีอัตโนมัติเมื่อซื้อคอร์สเรียนทำคลิป AI ปักตะกร้า ฿299'
      )
    )
  )
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    poster_url = EXCLUDED.poster_url,
    logo_url = EXCLUDED.logo_url,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    badge_text = EXCLUDED.badge_text,
    badge_color = EXCLUDED.badge_color,
    is_active = EXCLUDED.is_active,
    is_coming_soon = EXCLUDED.is_coming_soon,
    trial_enabled = EXCLUDED.trial_enabled,
    flow_url = EXCLUDED.flow_url,
    trial_flow_url = EXCLUDED.trial_flow_url,
    features = COALESCE(public.tools.features, '{}'::jsonb) || EXCLUDED.features,
    updated_at = now();

-- Link Lesson 14 -> puppap-ugc-product & Lesson 22 -> puppap-fashion-studio on tiktok-ai-affiliate
DO $$
DECLARE
  v_features jsonb;
  v_lessons jsonb;
  v_updated_lessons jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_idx integer := 0;
BEGIN
  SELECT features INTO v_features
  FROM public.tools
  WHERE slug = 'tiktok-ai-affiliate'
  FOR UPDATE;

  IF v_features IS NOT NULL AND jsonb_typeof(v_features->'course_lessons') = 'array' THEN
    v_lessons := v_features->'course_lessons';
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_lessons)
    LOOP
      v_idx := v_idx + 1;
      IF v_idx = 14 OR (v_elem->>'id') = 'lesson-14' THEN
        v_elem := jsonb_set(v_elem, '{flow_tool_slug}', '"puppap-ugc-product"'::jsonb, true);
      ELSIF v_idx = 22 OR (v_elem->>'id') = 'lesson-22' THEN
        v_elem := jsonb_set(v_elem, '{flow_tool_slug}', '"puppap-fashion-studio"'::jsonb, true);
      END IF;
      v_updated_lessons := v_updated_lessons || jsonb_build_array(v_elem);
    END LOOP;

    UPDATE public.tools
    SET features = jsonb_set(
          jsonb_set(
            v_features,
            '{course_lessons}',
            v_updated_lessons,
            true
          ),
          '{guide_drive_url}',
          '"https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link"'::jsonb,
          true
        ),
        updated_at = now()
    WHERE slug = 'tiktok-ai-affiliate';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Complete 6 SECURITY DEFINER RPCs
-- -----------------------------------------------------------------------------

-- 2.1 Universal 64-Bit Advisory Lock Key Function (PG 13 & PG 14+ Compatible)
CREATE OR REPLACE FUNCTION public.user_advisory_lock_id(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_id bigint;
BEGIN
  IF current_setting('server_version_num')::int >= 140000 THEN
    EXECUTE 'SELECT hashtextextended($1::text, 0)' INTO v_lock_id USING p_user_id;
  ELSE
    v_lock_id := ('x' || substr(md5(p_user_id::text), 1, 16))::bit(64)::bigint;
  END IF;
  RETURN v_lock_id;
END;
$$;

-- 2.2 Approve Order & Grant Bundle (4 Parameters, Single Outer BEGIN...EXCEPTION...END)
CREATE OR REPLACE FUNCTION public.approve_order_and_grant_bundle(
  p_order_id uuid,
  p_approved_by uuid DEFAULT NULL,
  p_approved_by_actor text DEFAULT NULL,
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id text := COALESCE(NULLIF(btrim(p_request_id), ''), gen_random_uuid()::text);
  v_user_id uuid;
  v_order record;
  v_tool_slug text;
  v_is_bundle boolean := false;
  v_target_tool_ids uuid[];
  v_target_tid uuid;
  v_key_id uuid;
  v_key_code text;
  v_reused_existing_key boolean := false;
  v_actor text;
  v_append_tag text;
  v_was_active boolean;
  v_changed_tools_count integer := 0;
  v_granted_slugs text[] := ARRAY[]::text[];
  v_t_slug text;
BEGIN
  -- Step 0: Per-RPC Timeouts & Maintenance Mode Guard
  SET LOCAL lock_timeout = '1000ms';
  SET LOCAL statement_timeout = '3500ms';
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'SET LOCAL transaction_timeout = ''4000ms''';
  END IF;

  IF EXISTS (SELECT 1 FROM public._system_maintenance WHERE key = 'maintenance_mode' AND is_enabled = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MAINTENANCE_MODE_ACTIVE', 'request_id', v_request_id);
  END IF;

  -- Step 2: Phase 1 Unlocked Pre-Read of user_id
  SELECT o.user_id INTO v_user_id
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND OR v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND', 'request_id', v_request_id);
  END IF;

  -- Step 3: Phase 2 Blocking Per-User 64-Bit Advisory Lock
  PERFORM pg_advisory_xact_lock(public.user_advisory_lock_id(v_user_id));

  -- Step 4: Phase 3 Re-Read orders FOR UPDATE under Advisory Lock
  SELECT o.id, o.user_id, o.user_email, o.tool_id, o.license_key_id, o.status,
         o.admin_note, o.revoke_reason, o.kept_active_via_order_id, o.approved_by_actor
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND', 'request_id', v_request_id);
  END IF;

  -- Step 5: Idempotency & State Guard
  IF v_order.status = 'rejected' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ORDER_ALREADY_REJECTED',
      'request_id', v_request_id
    );
  END IF;

  SELECT t.slug INTO v_tool_slug
  FROM public.tools t
  WHERE t.id = v_order.tool_id;

  IF v_tool_slug IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'TOOL_NOT_FOUND', 'request_id', v_request_id);
  END IF;

  IF v_tool_slug IN ('tiktok-ai-affiliate', 'puppap-fashion-studio', 'puppap-ugc-product') THEN
    v_is_bundle := true;
    SELECT array_agg(t.id ORDER BY t.sort_order, t.id)
    INTO v_target_tool_ids
    FROM public.tools t
    WHERE t.slug IN ('tiktok-ai-affiliate', 'puppap-fashion-studio', 'puppap-ugc-product')
      AND t.is_active = true;
  ELSE
    v_is_bundle := false;
    v_target_tool_ids := ARRAY[v_order.tool_id];
  END IF;

  -- If already approved: Idempotent Repair Path (do not mint duplicate license_keys)
  IF v_order.status = 'approved' THEN
    v_key_id := v_order.license_key_id;
    IF v_key_id IS NOT NULL THEN
      SELECT lk.key_code INTO v_key_code FROM public.license_keys lk WHERE lk.id = v_key_id;
    END IF;

    FOREACH v_target_tid IN ARRAY COALESCE(v_target_tool_ids, ARRAY[]::uuid[])
    LOOP
      SELECT ut.is_active INTO v_was_active
      FROM public.user_tools ut
      WHERE ut.user_id = v_user_id AND ut.tool_id = v_target_tid;

      INSERT INTO public.user_tools (user_id, tool_id, license_key_id, is_active, activated_at)
      VALUES (v_user_id, v_target_tid, v_key_id, true, now())
      ON CONFLICT (user_id, tool_id) DO UPDATE
      SET is_active = true,
          license_key_id = CASE
            WHEN user_tools.is_active = false OR user_tools.license_key_id IS NULL THEN EXCLUDED.license_key_id
            ELSE user_tools.license_key_id
          END,
          activated_at = CASE
            WHEN user_tools.is_active = false THEN now()
            ELSE user_tools.activated_at
          END;

      IF v_was_active IS DISTINCT FROM true THEN
        v_changed_tools_count := v_changed_tools_count + 1;
      END IF;

      SELECT t.slug INTO v_t_slug FROM public.tools t WHERE t.id = v_target_tid;
      IF v_t_slug IS NOT NULL THEN
        v_granted_slugs := array_append(v_granted_slugs, v_t_slug);
      END IF;
    END LOOP;

    IF v_changed_tools_count > 0 THEN
      UPDATE public.profiles
      SET bundle_state_version = COALESCE(bundle_state_version, 0) + 1,
          bundle_heal_fail_count = 0,
          bundle_heal_window_start = NULL,
          last_circuit_alert_at = NULL
      WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'already_approved', true,
      'repaired', (v_changed_tools_count > 0),
      'is_bundle', v_is_bundle,
      'license_key_id', v_key_id,
      'key_code', v_key_code,
      'granted_slugs', to_jsonb(v_granted_slugs),
      'request_id', v_request_id
    );
  END IF;

  -- Step 6: Pending -> Approved Transition & Shared-Key Dedup for Concurrent Tabs
  SELECT lk.id, lk.key_code
  INTO v_key_id, v_key_code
  FROM public.license_keys lk
  WHERE lk.activated_by = v_user_id
    AND lk.tool_id = v_order.tool_id
    AND lk.status = 'activated'
  ORDER BY lk.activated_at DESC NULLS LAST, lk.created_at DESC
  LIMIT 1;

  IF v_key_id IS NOT NULL THEN
    v_reused_existing_key := true;
  ELSE
    v_key_code := 'PHM-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)) || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 5, 4));

    INSERT INTO public.license_keys (
      tool_id,
      key_code,
      status,
      activated_at,
      activated_by,
      activated_email,
      note
    )
    VALUES (
      v_order.tool_id,
      v_key_code,
      'activated',
      now(),
      v_user_id,
      v_order.user_email,
      CASE WHEN v_is_bundle THEN 'Course Bundle Auto-Unlock (3 Items)' ELSE 'Single Tool Order' END
    )
    RETURNING id INTO v_key_id;
  END IF;

  v_actor := COALESCE(
    NULLIF(btrim(p_approved_by_actor), ''),
    CASE WHEN p_approved_by IS NOT NULL THEN 'admin:' || p_approved_by::text ELSE 'system:auto_slip' END
  );

  v_append_tag := format(
    '[APPROVED at %s by %s]',
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    v_actor
  );

  UPDATE public.orders
  SET status = 'approved',
      approved_at = now(),
      approved_by = p_approved_by,
      approved_by_actor = v_actor,
      license_key_id = v_key_id,
      grant_retry_count = 0,
      grant_retry_exhausted = false,
      last_grant_error = NULL,
      admin_note = CASE
        WHEN COALESCE(btrim(admin_note), '') = '' THEN v_append_tag
        ELSE admin_note || ' | ' || v_append_tag
      END
  WHERE id = p_order_id;

  FOREACH v_target_tid IN ARRAY COALESCE(v_target_tool_ids, ARRAY[]::uuid[])
  LOOP
    SELECT ut.is_active INTO v_was_active
    FROM public.user_tools ut
    WHERE ut.user_id = v_user_id AND ut.tool_id = v_target_tid;

    INSERT INTO public.user_tools (user_id, tool_id, license_key_id, is_active, activated_at)
    VALUES (v_user_id, v_target_tid, v_key_id, true, now())
    ON CONFLICT (user_id, tool_id) DO UPDATE
    SET is_active = true,
        license_key_id = CASE
          WHEN user_tools.is_active = false OR user_tools.license_key_id IS NULL THEN EXCLUDED.license_key_id
          ELSE user_tools.license_key_id
        END,
        activated_at = CASE
          WHEN user_tools.is_active = false THEN now()
          ELSE user_tools.activated_at
        END;

    IF v_was_active IS DISTINCT FROM true THEN
      v_changed_tools_count := v_changed_tools_count + 1;
    END IF;

    SELECT t.slug INTO v_t_slug FROM public.tools t WHERE t.id = v_target_tid;
    IF v_t_slug IS NOT NULL THEN
      v_granted_slugs := array_append(v_granted_slugs, v_t_slug);
    END IF;
  END LOOP;

  -- Convert any active trials for the granted tools to 'converted'
  UPDATE public.user_trials
  SET status = 'converted'
  WHERE user_id = v_user_id
    AND tool_id = ANY(COALESCE(v_target_tool_ids, ARRAY[]::uuid[]))
    AND status = 'active';

  -- Bump bundle_state_version and reset circuit breaker
  UPDATE public.profiles
  SET bundle_state_version = CASE
        WHEN v_changed_tools_count > 0 THEN COALESCE(bundle_state_version, 0) + 1
        ELSE COALESCE(bundle_state_version, 0)
      END,
      bundle_heal_fail_count = 0,
      bundle_heal_window_start = NULL,
      last_circuit_alert_at = NULL
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_approved', false,
    'reused_existing_key', v_reused_existing_key,
    'is_bundle', v_is_bundle,
    'license_key_id', v_key_id,
    'key_code', v_key_code,
    'approved_by_actor', v_actor,
    'granted_slugs', to_jsonb(v_granted_slugs),
    'request_id', v_request_id
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ADVISORY_LOCK_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN query_canceled THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_INTERNAL_ERROR',
      'request_id', v_request_id,
      '_internal_sqlstate', SQLSTATE,
      '_internal_sqlerrm', SQLERRM
    );
END;
$$;

-- 2.3 Revoke Order & Bundle (5 Parameters, Single Outer BEGIN...EXCEPTION...END)
CREATE OR REPLACE FUNCTION public.revoke_order_and_bundle(
  p_order_id uuid,
  p_admin_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_revoke_reason text DEFAULT 'admin_revoke',
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id text := COALESCE(NULLIF(btrim(p_request_id), ''), gen_random_uuid()::text);
  v_user_id uuid;
  v_order record;
  v_clean_note text;
  v_append_tag text;
  v_surviving_shared_order_id uuid := NULL;
  v_tool_slug text;
  v_is_bundle boolean := false;
  v_bundle_tool_ids uuid[];
  v_target_tool_ids uuid[];
  v_tid uuid;
  v_surviving_key_id uuid;
  v_changed_tools_count integer := 0;
  v_revoked_slugs text[] := ARRAY[]::text[];
  v_retained_slugs text[] := ARRAY[]::text[];
  v_t_slug text;
  v_rows_deleted integer;
BEGIN
  -- Step 0: Timeouts & Maintenance Check
  SET LOCAL lock_timeout = '1000ms';
  SET LOCAL statement_timeout = '3500ms';
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'SET LOCAL transaction_timeout = ''4000ms''';
  END IF;

  IF EXISTS (SELECT 1 FROM public._system_maintenance WHERE key = 'maintenance_mode' AND is_enabled = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MAINTENANCE_MODE_ACTIVE', 'request_id', v_request_id);
  END IF;

  -- Step 1: Validate p_revoke_reason
  IF p_revoke_reason IS NULL OR p_revoke_reason NOT IN ('admin_revoke', 'refund', 'chargeback', 'duplicate_cancel') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'INVALID_REVOKE_REASON',
      'request_id', v_request_id
    );
  END IF;

  -- Step 2: Phase 1 Unlocked Pre-Read of user_id
  SELECT o.user_id INTO v_user_id
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF NOT FOUND OR v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND', 'request_id', v_request_id);
  END IF;

  -- Step 3: Phase 2 Blocking Per-User 64-Bit Advisory Lock
  PERFORM pg_advisory_xact_lock(public.user_advisory_lock_id(v_user_id));

  -- Step 4: Phase 3 Re-Read orders FOR UPDATE under Advisory Lock
  SELECT o.id, o.user_id, o.user_email, o.tool_id, o.license_key_id, o.status,
         o.admin_note, o.revoke_reason, o.kept_active_via_order_id, o.approved_by_actor
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND', 'request_id', v_request_id);
  END IF;

  -- Step 5: Idempotency & State Guard
  IF v_order.status = 'rejected' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_revoked', true,
      'revoke_reason', v_order.revoke_reason,
      'kept_active_via_order_id', v_order.kept_active_via_order_id,
      'request_id', v_request_id
    );
  END IF;

  IF v_order.status NOT IN ('approved', 'pending') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ORDER_NOT_APPROVED',
      'request_id', v_request_id
    );
  END IF;

  -- Step 6: Check Shared-Key Survivorship & Multi-Order Tool Survivorship
  IF v_order.license_key_id IS NOT NULL THEN
    SELECT o2.id INTO v_surviving_shared_order_id
    FROM public.orders o2
    WHERE o2.license_key_id = v_order.license_key_id
      AND o2.id <> p_order_id
      AND o2.status = 'approved'
    ORDER BY o2.approved_at DESC NULLS LAST, o2.created_at DESC
    LIMIT 1;
  END IF;

  v_clean_note := LEFT(
    TRIM(
      REPLACE(
        REPLACE(
          REPLACE(COALESCE(p_reason, ''), E'\r', ' '),
          E'\n', ' '
        ),
        '|', '/'
      )
    ),
    500
  );

  v_append_tag := format(
    '[REVOKED:%s at %s by %s%s]',
    p_revoke_reason,
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    COALESCE(p_admin_id::text, 'system'),
    CASE WHEN v_clean_note <> '' THEN ': ' || v_clean_note ELSE '' END
  );

  UPDATE public.orders
  SET status = 'rejected',
      revoke_reason = p_revoke_reason,
      kept_active_via_order_id = v_surviving_shared_order_id,
      admin_note = CASE
        WHEN COALESCE(btrim(admin_note), '') = '' THEN v_append_tag
        ELSE admin_note || ' | ' || v_append_tag
      END
  WHERE id = p_order_id;

  -- If another approved order shares the exact same license_key_id, keep key & user_tools untouched!
  IF v_surviving_shared_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_revoked', false,
      'revoke_reason', p_revoke_reason,
      'kept_active_via_order_id', v_surviving_shared_order_id,
      'revoked_slugs', '[]'::jsonb,
      'request_id', v_request_id
    );
  END IF;

  -- Otherwise revoke the order's license key (if any)
  IF v_order.license_key_id IS NOT NULL THEN
    UPDATE public.license_keys
    SET status = 'revoked'
    WHERE id = v_order.license_key_id;
  END IF;

  SELECT t.slug INTO v_tool_slug FROM public.tools t WHERE t.id = v_order.tool_id;
  SELECT array_agg(t.id ORDER BY t.sort_order, t.id)
  INTO v_bundle_tool_ids
  FROM public.tools t
  WHERE t.slug IN ('tiktok-ai-affiliate', 'puppap-fashion-studio', 'puppap-ugc-product')
    AND t.is_active = true;

  IF v_tool_slug IN ('tiktok-ai-affiliate', 'puppap-fashion-studio', 'puppap-ugc-product') THEN
    v_is_bundle := true;
    v_target_tool_ids := COALESCE(v_bundle_tool_ids, ARRAY[v_order.tool_id]);
  ELSE
    v_is_bundle := false;
    v_target_tool_ids := ARRAY[v_order.tool_id];
  END IF;

  FOREACH v_tid IN ARRAY v_target_tool_ids
  LOOP
    SELECT t.slug INTO v_t_slug FROM public.tools t WHERE t.id = v_tid;
    v_surviving_key_id := NULL;

    -- Check if user has another surviving activated license key for this specific tool OR any bundle tool (if bundle item)
    SELECT lk.id INTO v_surviving_key_id
    FROM public.license_keys lk
    WHERE lk.activated_by = v_user_id
      AND lk.status = 'activated'
      AND (p_order_id IS NULL OR lk.id IS DISTINCT FROM v_order.license_key_id)
      AND (
        lk.tool_id = v_tid
        OR (v_is_bundle AND lk.tool_id = ANY(v_bundle_tool_ids))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o_rej
        WHERE o_rej.license_key_id = lk.id
          AND o_rej.status = 'rejected'
          AND NOT EXISTS (
            SELECT 1 FROM public.orders o_act
            WHERE o_act.license_key_id = lk.id
              AND o_act.status = 'approved'
          )
      )
    ORDER BY lk.activated_at DESC NULLS LAST, lk.created_at DESC
    LIMIT 1;

    IF v_surviving_key_id IS NOT NULL THEN
      -- Re-point user_tools to surviving key so entitlement stays active!
      UPDATE public.user_tools
      SET license_key_id = v_surviving_key_id,
          is_active = true
      WHERE user_id = v_user_id AND tool_id = v_tid;

      IF v_t_slug IS NOT NULL THEN
        v_retained_slugs := array_append(v_retained_slugs, v_t_slug);
      END IF;
    ELSE
      -- No surviving key -> delete user_tools row & restore unexpired trial if any
      DELETE FROM public.user_tools
      WHERE user_id = v_user_id AND tool_id = v_tid;
      GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

      IF v_rows_deleted > 0 THEN
        v_changed_tools_count := v_changed_tools_count + v_rows_deleted;
      END IF;

      -- Restore trial if expires_at > now()
      UPDATE public.user_trials
      SET status = 'active'
      WHERE user_id = v_user_id
        AND tool_id = v_tid
        AND status = 'converted'
        AND expires_at > now();

      IF v_t_slug IS NOT NULL THEN
        v_revoked_slugs := array_append(v_revoked_slugs, v_t_slug);
      END IF;
    END IF;
  END LOOP;

  -- Bump bundle_state_version ONLY if user_tools actually changed
  IF v_changed_tools_count > 0 THEN
    UPDATE public.profiles
    SET bundle_state_version = COALESCE(bundle_state_version, 0) + 1
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'already_revoked', false,
    'revoke_reason', p_revoke_reason,
    'kept_active_via_order_id', NULL,
    'revoked_slugs', to_jsonb(v_revoked_slugs),
    'retained_slugs', to_jsonb(v_retained_slugs),
    'request_id', v_request_id
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ADVISORY_LOCK_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN query_canceled THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_INTERNAL_ERROR',
      'request_id', v_request_id,
      '_internal_sqlstate', SQLSTATE,
      '_internal_sqlerrm', SQLERRM
    );
END;
$$;

-- 2.4 Attempt Course Bundle Heal (2 Parameters, Non-Blocking Lock + 30s Cooldown + 3x/1h Circuit Breaker)
CREATE OR REPLACE FUNCTION public.attempt_course_bundle_heal(
  p_user_id uuid,
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id text := COALESCE(NULLIF(btrim(p_request_id), ''), gen_random_uuid()::text);
  v_prof record;
  v_bundle_tool_ids uuid[];
  v_qualifying_key_id uuid;
  v_tid uuid;
  v_was_active boolean;
  v_healed_count integer := 0;
  v_new_version bigint;
BEGIN
  SET LOCAL lock_timeout = '1000ms';
  SET LOCAL statement_timeout = '3000ms';
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'SET LOCAL transaction_timeout = ''3500ms''';
  END IF;

  IF EXISTS (SELECT 1 FROM public._system_maintenance WHERE key = 'maintenance_mode' AND is_enabled = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MAINTENANCE_MODE_ACTIVE', 'request_id', v_request_id);
  END IF;

  -- Non-blocking advisory lock so render/sync yields immediately if user is in checkout
  IF NOT pg_try_advisory_xact_lock(public.user_advisory_lock_id(p_user_id)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADVISORY_LOCK_TIMEOUT', 'request_id', v_request_id);
  END IF;

  SELECT id, bundle_state_version, last_bundle_heal_at, bundle_heal_fail_count, bundle_heal_window_start
  INTO v_prof
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PROFILE_NOT_FOUND', 'request_id', v_request_id);
  END IF;

  -- Check 3x/1h circuit breaker
  IF COALESCE(v_prof.bundle_heal_fail_count, 0) >= 3
     AND v_prof.bundle_heal_window_start IS NOT NULL
     AND v_prof.bundle_heal_window_start > (now() - INTERVAL '1 hour') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'HEAL_CIRCUIT_OPEN',
      'fail_count', v_prof.bundle_heal_fail_count,
      'request_id', v_request_id
    );
  END IF;

  -- Check 30-second per-user cooldown
  IF v_prof.last_bundle_heal_at IS NOT NULL
     AND v_prof.last_bundle_heal_at > (now() - INTERVAL '30 seconds') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'HEAL_COOLDOWN_ACTIVE',
      'last_heal_at', v_prof.last_bundle_heal_at,
      'request_id', v_request_id
    );
  END IF;

  SELECT array_agg(t.id ORDER BY t.sort_order, t.id)
  INTO v_bundle_tool_ids
  FROM public.tools t
  WHERE t.slug IN ('tiktok-ai-affiliate', 'puppap-fashion-studio', 'puppap-ugc-product')
    AND t.is_active = true;

  -- Check if user has a valid qualifying entitlement (active user_tool + non-revoked key, or approved order)
  SELECT COALESCE(
    (
      SELECT ut.license_key_id
      FROM public.user_tools ut
      LEFT JOIN public.license_keys lk ON lk.id = ut.license_key_id
      WHERE ut.user_id = p_user_id
        AND ut.tool_id = ANY(v_bundle_tool_ids)
        AND ut.is_active = true
        AND (ut.license_key_id IS NULL OR lk.status = 'activated')
      LIMIT 1
    ),
    (
      SELECT o.license_key_id
      FROM public.orders o
      LEFT JOIN public.license_keys lk ON lk.id = o.license_key_id
      WHERE o.user_id = p_user_id
        AND o.tool_id = ANY(v_bundle_tool_ids)
        AND o.status = 'approved'
        AND (o.license_key_id IS NULL OR lk.status = 'activated')
      ORDER BY o.approved_at DESC NULLS LAST
      LIMIT 1
    )
  ) INTO v_qualifying_key_id;

  -- Also check if user has an active user_tool with NULL license_key_id
  IF v_qualifying_key_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_tools ut
    LEFT JOIN public.license_keys lk ON lk.id = ut.license_key_id
    WHERE ut.user_id = p_user_id
      AND ut.tool_id = ANY(v_bundle_tool_ids)
      AND ut.is_active = true
      AND (ut.license_key_id IS NULL OR lk.status = 'activated')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.license_keys lk ON lk.id = o.license_key_id
    WHERE o.user_id = p_user_id
      AND o.tool_id = ANY(v_bundle_tool_ids)
      AND o.status = 'approved'
      AND (o.license_key_id IS NULL OR lk.status = 'activated')
  ) THEN
    UPDATE public.profiles
    SET last_bundle_heal_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'ok', true,
      'eligible', false,
      'healed_count', 0,
      'bundle_state_version', v_prof.bundle_state_version,
      'request_id', v_request_id
    );
  END IF;

  FOREACH v_tid IN ARRAY COALESCE(v_bundle_tool_ids, ARRAY[]::uuid[])
  LOOP
    SELECT ut.is_active INTO v_was_active
    FROM public.user_tools ut
    WHERE ut.user_id = p_user_id AND ut.tool_id = v_tid;

    IF v_was_active IS DISTINCT FROM true THEN
      INSERT INTO public.user_tools (user_id, tool_id, license_key_id, is_active, activated_at)
      VALUES (p_user_id, v_tid, v_qualifying_key_id, true, now())
      ON CONFLICT (user_id, tool_id) DO UPDATE
      SET is_active = true,
          license_key_id = COALESCE(user_tools.license_key_id, EXCLUDED.license_key_id),
          activated_at = now();

      v_healed_count := v_healed_count + 1;
    END IF;
  END LOOP;

  v_new_version := CASE
    WHEN v_healed_count > 0 THEN COALESCE(v_prof.bundle_state_version, 0) + 1
    ELSE COALESCE(v_prof.bundle_state_version, 0)
  END;

  UPDATE public.profiles
  SET last_bundle_heal_at = now(),
      bundle_state_version = v_new_version,
      bundle_heal_fail_count = 0,
      bundle_heal_window_start = NULL,
      last_circuit_alert_at = NULL
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'eligible', true,
    'healed_count', v_healed_count,
    'bundle_state_version', v_new_version,
    'request_id', v_request_id
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ADVISORY_LOCK_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN query_canceled THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_INTERNAL_ERROR',
      'request_id', v_request_id,
      '_internal_sqlstate', SQLSTATE,
      '_internal_sqlerrm', SQLERRM
    );
END;
$$;

-- 2.5 Record Bundle Heal Failure (3 Parameters, Atomic 3x/1h Circuit Breaker + 6h Re-Alert)
CREATE OR REPLACE FUNCTION public.record_bundle_heal_failure(
  p_user_id uuid,
  p_error_detail text DEFAULT NULL,
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id text := COALESCE(NULLIF(btrim(p_request_id), ''), gen_random_uuid()::text);
  v_prof record;
  v_new_count integer;
  v_new_window timestamptz;
  v_should_alert boolean := false;
  v_new_alert_at timestamptz;
BEGIN
  SET LOCAL lock_timeout = '1000ms';
  SET LOCAL statement_timeout = '3000ms';
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'SET LOCAL transaction_timeout = ''3500ms''';
  END IF;

  SELECT id, bundle_heal_fail_count, bundle_heal_window_start, last_circuit_alert_at
  INTO v_prof
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PROFILE_NOT_FOUND', 'request_id', v_request_id);
  END IF;

  IF v_prof.bundle_heal_window_start IS NULL
     OR v_prof.bundle_heal_window_start < (now() - INTERVAL '1 hour') THEN
    v_new_count := 1;
    v_new_window := now();
  ELSE
    v_new_count := COALESCE(v_prof.bundle_heal_fail_count, 0) + 1;
    v_new_window := v_prof.bundle_heal_window_start;
  END IF;

  v_new_alert_at := v_prof.last_circuit_alert_at;
  IF v_new_count >= 3 AND (
    v_prof.last_circuit_alert_at IS NULL
    OR v_prof.last_circuit_alert_at < (now() - INTERVAL '6 hours')
  ) THEN
    v_should_alert := true;
    v_new_alert_at := now();
  END IF;

  UPDATE public.profiles
  SET bundle_heal_fail_count = v_new_count,
      bundle_heal_window_start = v_new_window,
      last_circuit_alert_at = v_new_alert_at,
      last_bundle_heal_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'fail_count', v_new_count,
    'circuit_open', (v_new_count >= 3),
    'should_alert', v_should_alert,
    'request_id', v_request_id
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ADVISORY_LOCK_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN query_canceled THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_INTERNAL_ERROR',
      'request_id', v_request_id,
      '_internal_sqlstate', SQLSTATE,
      '_internal_sqlerrm', SQLERRM
    );
END;
$$;

-- 2.6 Cleanup Stale Bundle Entitlements (1 Parameter, 3500ms Wall-Clock Cutoff, Max 20 Users x 5 Keys)
CREATE OR REPLACE FUNCTION public.cleanup_stale_bundle_entitlements(
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id text := COALESCE(NULLIF(btrim(p_request_id), ''), gen_random_uuid()::text);
  v_start_ts timestamptz := clock_timestamp();
  v_stopped_early boolean := false;
  v_candidate_user record;
  v_orphan_keys_revoked integer := 0;
  v_users_processed integer := 0;
  v_revoked_in_user integer := 0;
  v_remaining_orphan_keys integer := 0;
  v_stale_pending_order_ids uuid[] := ARRAY[]::uuid[];
  v_stale_pending_count integer := 0;
BEGIN
  SET LOCAL lock_timeout = '1000ms';
  SET LOCAL statement_timeout = '5000ms';
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'SET LOCAL transaction_timeout = ''5500ms''';
  END IF;

  IF EXISTS (SELECT 1 FROM public._system_maintenance WHERE key = 'maintenance_mode' AND is_enabled = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'MAINTENANCE_MODE_ACTIVE', 'request_id', v_request_id);
  END IF;

  -- Phase 1: Revoke orphan activated license_keys (> 15 mins old, no user_tools, no approved/pending order)
  -- Max 20 users per round, max 5 keys per user, 3500ms wall-clock cutoff
  FOR v_candidate_user IN
    SELECT DISTINCT lk.activated_by AS user_id
    FROM public.license_keys lk
    WHERE lk.status = 'activated'
      AND lk.activated_by IS NOT NULL
      AND COALESCE(lk.activated_at, lk.created_at) < (now() - INTERVAL '15 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_tools ut
        WHERE ut.license_key_id = lk.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.license_key_id = lk.id
          AND o.status IN ('approved', 'pending')
      )
    LIMIT 20
  LOOP
    IF clock_timestamp() - v_start_ts > INTERVAL '3500 milliseconds' THEN
      v_stopped_early := true;
      EXIT;
    END IF;

    IF pg_try_advisory_xact_lock(public.user_advisory_lock_id(v_candidate_user.user_id)) THEN
      v_users_processed := v_users_processed + 1;

      WITH target_keys AS (
        SELECT lk.id
        FROM public.license_keys lk
        WHERE lk.status = 'activated'
          AND lk.activated_by = v_candidate_user.user_id
          AND COALESCE(lk.activated_at, lk.created_at) < (now() - INTERVAL '15 minutes')
          AND NOT EXISTS (
            SELECT 1 FROM public.user_tools ut
            WHERE ut.license_key_id = lk.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.license_key_id = lk.id
              AND o.status IN ('approved', 'pending')
          )
        ORDER BY lk.created_at ASC
        LIMIT 5
        FOR UPDATE SKIP LOCKED
      )
      UPDATE public.license_keys lk_upd
      SET status = 'revoked',
          note = COALESCE(lk_upd.note, '') || ' | [AUTO_CLEANUP_ORPHAN]'
      FROM target_keys tk
      WHERE lk_upd.id = tk.id;

      GET DIAGNOSTICS v_revoked_in_user = ROW_COUNT;
      v_orphan_keys_revoked := v_orphan_keys_revoked + v_revoked_in_user;
    END IF;
  END LOOP;

  -- Count remaining orphan keys in queue
  SELECT count(*) INTO v_remaining_orphan_keys
  FROM public.license_keys lk
  WHERE lk.status = 'activated'
    AND lk.activated_by IS NOT NULL
    AND COALESCE(lk.activated_at, lk.created_at) < (now() - INTERVAL '15 minutes')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_tools ut WHERE ut.license_key_id = lk.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o WHERE o.license_key_id = lk.id AND o.status IN ('approved', 'pending')
    );

  -- Phase 2: Query-only discovery of stale pending orders needing auto-retry in Node.js layer
  SELECT
    COALESCE(array_agg(sub.id), ARRAY[]::uuid[]),
    count(*)
  INTO v_stale_pending_order_ids, v_stale_pending_count
  FROM (
    SELECT o.id
    FROM public.orders o
    WHERE o.status = 'pending'
      AND o.admin_note LIKE '%[GRANT_RETRY_NEEDED]%'
      AND o.grant_retry_exhausted = false
      AND o.grant_retry_count < 3
      AND o.created_at < (now() - INTERVAL '15 minutes')
    ORDER BY o.created_at ASC
    LIMIT 10
  ) sub;

  RETURN jsonb_build_object(
    'ok', true,
    'users_processed', v_users_processed,
    'orphan_keys_revoked', v_orphan_keys_revoked,
    'remaining_orphan_keys_count', v_remaining_orphan_keys,
    'stale_pending_orders_count', v_stale_pending_count,
    'stale_pending_order_ids', to_jsonb(v_stale_pending_order_ids),
    'stopped_early', v_stopped_early,
    'request_id', v_request_id
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ADVISORY_LOCK_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN query_canceled THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_TIMEOUT',
      'request_id', v_request_id
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'RPC_INTERNAL_ERROR',
      'request_id', v_request_id,
      '_internal_sqlstate', SQLSTATE,
      '_internal_sqlerrm', SQLERRM
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2.7 Lock Down Function EXECUTE Privileges & Verify prosecdef = true
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.user_advisory_lock_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_order_and_grant_bundle(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_order_and_bundle(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attempt_course_bundle_heal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_bundle_heal_failure(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_stale_bundle_entitlements(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.user_advisory_lock_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_order_and_grant_bundle(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_order_and_bundle(uuid, uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attempt_course_bundle_heal(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_bundle_heal_failure(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_bundle_entitlements(text) TO service_role;

DO $$
DECLARE
  v_secdef_count integer;
BEGIN
  SELECT count(*) INTO v_secdef_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proname || '(' || oidvectortypes(p.proargtypes) || ')') IN (
      'user_advisory_lock_id(uuid)',
      'approve_order_and_grant_bundle(uuid, uuid, text, text)',
      'revoke_order_and_bundle(uuid, uuid, text, text, text)',
      'attempt_course_bundle_heal(uuid, text)',
      'record_bundle_heal_failure(uuid, text, text)',
      'cleanup_stale_bundle_entitlements(text)'
    );
  IF v_secdef_count <> 6 THEN
    RAISE EXCEPTION 'SECURITY_DEFINER_CHECK_FAILED: expected 6 SECURITY DEFINER functions, found %', v_secdef_count;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2.8 Idempotent Up-Migration Data-Fix & Bundle Backfill + Log to _migration_log
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_bundle_tool_ids uuid[];
  v_fixed_count integer := 0;
  v_skipped_count integer := 0;
  v_rec record;
  v_tid uuid;
  v_existing record;
  v_new_ut_id uuid;
BEGIN
  SELECT array_agg(t.id ORDER BY t.sort_order, t.id)
  INTO v_bundle_tool_ids
  FROM public.tools t
  WHERE t.slug IN ('tiktok-ai-affiliate', 'puppap-fashion-studio', 'puppap-ugc-product')
    AND t.is_active = true;

  -- Find all users with a valid active bundle tool or approved bundle order
  FOR v_rec IN
    SELECT DISTINCT sub.user_id, sub.license_key_id
    FROM (
      SELECT ut.user_id, ut.license_key_id
      FROM public.user_tools ut
      LEFT JOIN public.license_keys lk ON lk.id = ut.license_key_id
      WHERE ut.tool_id = ANY(v_bundle_tool_ids)
        AND ut.is_active = true
        AND (ut.license_key_id IS NULL OR lk.status = 'activated')
      UNION
      SELECT o.user_id, o.license_key_id
      FROM public.orders o
      LEFT JOIN public.license_keys lk ON lk.id = o.license_key_id
      WHERE o.tool_id = ANY(v_bundle_tool_ids)
        AND o.status = 'approved'
        AND o.user_id IS NOT NULL
        AND (o.license_key_id IS NULL OR lk.status = 'activated')
    ) sub
  LOOP
    FOREACH v_tid IN ARRAY COALESCE(v_bundle_tool_ids, ARRAY[]::uuid[])
    LOOP
      SELECT ut.id, ut.is_active, ut.activated_at
      INTO v_existing
      FROM public.user_tools ut
      WHERE ut.user_id = v_rec.user_id AND ut.tool_id = v_tid;

      IF FOUND THEN
        IF v_existing.is_active = true THEN
          v_skipped_count := v_skipped_count + 1;
        ELSE
          -- Record original inactive state in audit table (idempotent ON CONFLICT DO NOTHING)
          UPDATE public.user_tools
          SET is_active = true,
              license_key_id = COALESCE(license_key_id, v_rec.license_key_id),
              activated_at = now()
          WHERE id = v_existing.id;

          INSERT INTO public._migration_20261105_user_tools_audit (
            user_tool_id, user_id, tool_id, previous_is_active, snapshot_activated_at, fixed_at
          )
          VALUES (
            v_existing.id, v_rec.user_id, v_tid, false, now(), now()
          )
          ON CONFLICT (user_tool_id) DO NOTHING;

          v_fixed_count := v_fixed_count + 1;
        END IF;
      ELSE
        INSERT INTO public.user_tools (user_id, tool_id, license_key_id, is_active, activated_at)
        VALUES (v_rec.user_id, v_tid, v_rec.license_key_id, true, now())
        RETURNING id INTO v_new_ut_id;

        INSERT INTO public._migration_20261105_user_tools_audit (
          user_tool_id, user_id, tool_id, previous_is_active, snapshot_activated_at, fixed_at
        )
        VALUES (
          v_new_ut_id, v_rec.user_id, v_tid, false, now(), now()
        )
        ON CONFLICT (user_tool_id) DO NOTHING;

        v_fixed_count := v_fixed_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Upsert Up-Migration execution record (accumulate fixed_rows_count, preserve first_executed_at)
  INSERT INTO public._migration_log (
    migration_name, direction, pg_version,
    fixed_rows_count, skipped_rows_count, run_count,
    last_request_id, first_executed_at, last_executed_at
  )
  VALUES (
    '20261105000001_course_bundle_rpcs', 'up', current_setting('server_version_num'),
    v_fixed_count, v_skipped_count, 1,
    'migration:20261105000001_up', now(), now()
  )
  ON CONFLICT (migration_name, direction) DO UPDATE
  SET last_run_id = gen_random_uuid(),
      pg_version = EXCLUDED.pg_version,
      fixed_rows_count = public._migration_log.fixed_rows_count + EXCLUDED.fixed_rows_count,
      skipped_rows_count = EXCLUDED.skipped_rows_count,
      run_count = public._migration_log.run_count + 1,
      last_request_id = EXCLUDED.last_request_id,
      last_executed_at = now();
END $$;

-- =============================================================================
-- DOWN MIGRATION REFERENCE (7-Step Ordered Rollback — Execute Only in Maintenance Mode)
-- =============================================================================
/*
-- Step 1: Pre-Flight & Maintenance Mode Guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'approved_at'
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: public.orders.approved_at column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public._system_maintenance
    WHERE key = 'maintenance_mode' AND is_enabled = true
  ) AND COALESCE(current_setting('app.maintenance_mode', true), '') <> 'on' THEN
    RAISE EXCEPTION 'MAINTENANCE_MODE_REQUIRED: Enable public._system_maintenance(maintenance_mode=true) before running Down Migration';
  END IF;
END $$;

-- Step 2 & Step 7: Restore user_tools.is_active from audit snapshot (with Timestamp & New-Order Guard) and Log 'down' Run
DO $$
DECLARE
  v_restored_count integer := 0;
  v_skipped_count integer := 0;
  v_total_audit integer := 0;
BEGIN
  SELECT count(*) INTO v_total_audit FROM public._migration_20261105_user_tools_audit;

  UPDATE public.user_tools AS ut
  SET is_active = audit.previous_is_active
  FROM public._migration_20261105_user_tools_audit AS audit
  WHERE ut.id = audit.user_tool_id
    AND ut.is_active = true
    AND ut.activated_at IS NOT DISTINCT FROM audit.snapshot_activated_at
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.user_id = ut.user_id
        AND (COALESCE(o.approved_at, o.updated_at, o.created_at) > audit.fixed_at OR o.created_at > audit.fixed_at)
    );
  GET DIAGNOSTICS v_restored_count = ROW_COUNT;
  v_skipped_count := GREATEST(v_total_audit - v_restored_count, 0);

  INSERT INTO public._migration_log (
    migration_name, direction, pg_version,
    fixed_rows_count, skipped_rows_count, run_count,
    last_request_id, first_executed_at, last_executed_at
  )
  VALUES (
    '20261105000001_course_bundle_rpcs', 'down', current_setting('server_version_num'),
    v_restored_count, v_skipped_count, 1,
    'migration:20261105000001_down', now(), now()
  )
  ON CONFLICT (migration_name, direction) DO UPDATE
  SET last_run_id = gen_random_uuid(),
      pg_version = EXCLUDED.pg_version,
      fixed_rows_count = EXCLUDED.fixed_rows_count,
      skipped_rows_count = EXCLUDED.skipped_rows_count,
      run_count = public._migration_log.run_count + 1,
      last_request_id = EXCLUDED.last_request_id,
      last_executed_at = now();
END $$;

-- Step 3: KEEP trg_orders_set_updated_at & public.tg_set_orders_updated_at() (only drop test trigger if present)
DROP TRIGGER IF EXISTS trg_test_25b_fail_user_tools ON public.user_tools;
DROP FUNCTION IF EXISTS public.fn_test_25b_fail_user_tools();

-- Step 4: Drop only the 5 bundle indexes created by this migration
DROP INDEX IF EXISTS public.idx_orders_license_key_active_pending;
DROP INDEX IF EXISTS public.idx_orders_approved_by_actor;
DROP INDEX IF EXISTS public.idx_user_trials_expires_at_active;
DROP INDEX IF EXISTS public.idx_license_keys_status_created_at;
DROP INDEX IF EXISTS public.idx_license_keys_activated_partial;

-- Step 5: Drop all 6 bundle RPCs (plus defensive drops) & verify pg_proc
DROP FUNCTION IF EXISTS public.approve_order_and_grant_bundle(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_order_and_bundle(uuid, uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.attempt_course_bundle_heal(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.record_bundle_heal_failure(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_stale_bundle_entitlements(text) CASCADE;
DROP FUNCTION IF EXISTS public.user_advisory_lock_id(uuid) CASCADE;

DROP FUNCTION IF EXISTS public.approve_order_and_grant_bundle(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_order_and_bundle(uuid, uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.record_bundle_heal_failure(uuid, text) CASCADE;

DO $$
DECLARE
  v_remaining_rpcs integer;
  v_trigger_fn_ok boolean;
BEGIN
  SELECT count(*) INTO v_remaining_rpcs
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      p.proname IN (
        'approve_order_and_grant_bundle',
        'revoke_order_and_bundle',
        'attempt_course_bundle_heal',
        'record_bundle_heal_failure',
        'cleanup_stale_bundle_entitlements',
        'user_advisory_lock_id'
      )
      OR (p.proname || '(' || oidvectortypes(p.proargtypes) || ')') IN (
        'approve_order_and_grant_bundle(uuid, uuid, text, text)',
        'revoke_order_and_bundle(uuid, uuid, text, text, text)',
        'attempt_course_bundle_heal(uuid, text)',
        'record_bundle_heal_failure(uuid, text, text)',
        'cleanup_stale_bundle_entitlements(text)',
        'user_advisory_lock_id(uuid)'
      )
    );

  IF v_remaining_rpcs > 0 THEN
    RAISE EXCEPTION 'DOWN_MIGRATION_INCOMPLETE: % bundle RPCs still exist in pg_proc', v_remaining_rpcs;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'tg_set_orders_updated_at'
      AND p.prosrc LIKE '%NEW.updated_at%'
  ) INTO v_trigger_fn_ok;

  IF NOT v_trigger_fn_ok THEN
    RAISE EXCEPTION 'DOWN_MIGRATION_INVALID: public.tg_set_orders_updated_at missing or corrupted';
  END IF;
END $$;

-- Step 6: Drop bundle columns (KEEP orders.approved_at & orders.updated_at with DEFAULT now() and NOT NULL)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS bundle_state_version,
  DROP COLUMN IF EXISTS last_bundle_heal_at,
  DROP COLUMN IF EXISTS bundle_heal_fail_count,
  DROP COLUMN IF EXISTS bundle_heal_window_start,
  DROP COLUMN IF EXISTS last_circuit_alert_at;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS approved_by_actor,
  DROP COLUMN IF EXISTS revoke_reason,
  DROP COLUMN IF EXISTS kept_active_via_order_id,
  DROP COLUMN IF EXISTS grant_retry_count,
  DROP COLUMN IF EXISTS grant_retry_exhausted,
  DROP COLUMN IF EXISTS last_grant_error;

ALTER TABLE public.user_trials
  DROP COLUMN IF EXISTS expires_at;
*/
