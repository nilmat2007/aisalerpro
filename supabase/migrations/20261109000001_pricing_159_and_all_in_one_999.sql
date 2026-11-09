-- =============================================================================
-- Migration: 20261109000001_pricing_159_and_all_in_one_999.sql
-- Purpose:
--   1. Update course ('tiktok-ai-affiliate') price from 799 THB to 159 THB
--      (features.original_price = '799', price = '159 บาท').
--   2. Update bonus tools badge_text to reflect ฿159 course & ฿999 All-in-One.
--   3. Upsert 'puppap-all-in-one' (แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ 999) into public.tools.
--   4. Provide sync_all_in_one_entitlements() function for future-proof unlocking
--      with per-tool exclusion flag support (features.exclude_from_all_in_one).
-- =============================================================================

-- 1. Update Course Price (฿799 -> ฿159)
UPDATE public.tools
SET
  price = '159 บาท',
  badge_text = '🔥 โปรลดพิเศษ ฿159 (จาก ฿799)',
  features = COALESCE(features, '{}'::jsonb) || '{"original_price": "799"}'::jsonb,
  updated_at = now()
WHERE slug = 'tiktok-ai-affiliate';

-- 2. Update Bonus Flow Tools Badge Text
UPDATE public.tools
SET
  badge_text = '🎁 แถมฟรีในคอร์ส ฿159 / แพ็กเหมา ฿999',
  updated_at = now()
WHERE slug IN ('puppap-fashion-studio', 'puppap-ugc-product');

-- 3. Upsert All-in-One 999 Package ('puppap-all-in-one')
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
  features,
  trial_enabled
)
VALUES (
  'แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ 999 (ปลดล็อกครบคอร์สเรียน + เครื่องมือ AI ทั้งหมด)',
  'puppap-all-in-one',
  '👑',
  '/images/course-tiktok-affiliate-poster.jpg',
  NULL,
  'ALL-IN-ONE-VIP',
  'จ่ายครั้งเดียวจบ! ปลดล็อกครบทั้งคอร์สเรียนนายหน้า TikTok ด้วย AI ปักตะกร้า (22 บทเรียน) และเครื่องมือ AI Flow Tools ทั้งหมดทุกตัวในระบบ พร้อมรับสิทธิ์อัปเดตเครื่องมือใหม่ในอนาคตที่เข้าร่วมรายการฟรีตลอดชีพ (ไม่มีค่ารายเดือน)',
  '999 บาท',
  '👑 คุ้มที่สุด! ปลดล็อกครบทุกอย่าง + อัปเดตอนาคต',
  'yellow',
  'VIP All-Access',
  true,
  false,
  0,
  jsonb_build_object(
    'category', 'bundle',
    'original_price', '2990',
    'tier_required', 'vip',
    'exclude_from_all_in_one', false,
    'highlights', jsonb_build_array(
      'ปลดล็อกคอร์สเรียนนายหน้า TikTok ด้วย AI ครบ 22 บทเรียน (มูลค่า ฿799)',
      'ปลดล็อก Ai SALER PRO - UGC Batch สร้างคลิปรีวิวขายดุ (มูลค่า ฿699)',
      'ปลดล็อก AI Content Factory + StoryPro V7.0 DECK (มูลค่ารวม ฿598)',
      'ปลดล็อก PUP PAP Fashion Studio + AI UGC Product (มูลค่ารวม ฿598)',
      'ปลดล็อกเครื่องมือ AI ทุกตัวในปัจจุบัน + อัปเดตเครื่องมือใหม่ในอนาคตที่เข้าร่วมรายการฟรี!'
    ),
    'tags', jsonb_build_array('all-in-one', 'vip', 'course', 'flow-tools', 'lifetime')
  ),
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  badge_text = EXCLUDED.badge_text,
  badge_color = EXCLUDED.badge_color,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active,
  is_coming_soon = EXCLUDED.is_coming_soon,
  sort_order = EXCLUDED.sort_order,
  features = COALESCE(public.tools.features, '{}'::jsonb) || EXCLUDED.features,
  updated_at = now();

-- 4. Helper Function: Sync All-in-One Entitlements for Current & Future Eligible Tools
CREATE OR REPLACE FUNCTION public.sync_all_in_one_entitlements(p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all_in_one_id uuid;
  v_inserted_count integer := 0;
BEGIN
  SELECT id INTO v_all_in_one_id
  FROM public.tools
  WHERE slug = 'puppap-all-in-one'
  LIMIT 1;

  IF v_all_in_one_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH eligible_users AS (
    SELECT DISTINCT ut.user_id, ut.license_key_id
    FROM public.user_tools ut
    WHERE ut.tool_id = v_all_in_one_id
      AND ut.is_active = true
      AND (p_user_id IS NULL OR ut.user_id = p_user_id)
    UNION
    SELECT DISTINCT o.user_id, o.license_key_id
    FROM public.orders o
    WHERE o.tool_id = v_all_in_one_id
      AND o.status = 'approved'
      AND (p_user_id IS NULL OR o.user_id = p_user_id)
  ),
  eligible_tools AS (
    SELECT t.id AS tool_id
    FROM public.tools t
    WHERE t.is_active = true
      AND (t.is_coming_soon = false OR t.slug IN ('tiktok-ai-affiliate', 'puppap-all-in-one'))
      AND COALESCE((t.features->>'exclude_from_all_in_one')::boolean, false) = false
  ),
  upserted AS (
    INSERT INTO public.user_tools (user_id, tool_id, license_key_id, is_active, activated_at)
    SELECT eu.user_id, et.tool_id, eu.license_key_id, true, now()
    FROM eligible_users eu
    CROSS JOIN eligible_tools et
    ON CONFLICT (user_id, tool_id) DO UPDATE
      SET is_active = true,
          license_key_id = COALESCE(public.user_tools.license_key_id, EXCLUDED.license_key_id)
      WHERE public.user_tools.is_active = false
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_inserted_count FROM upserted;

  RETURN v_inserted_count;
END;
$$;
