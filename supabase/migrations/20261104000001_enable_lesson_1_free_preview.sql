-- ============================================================================
-- Migration: Enable Free Preview on Lesson 1 (slug = 'tiktok-ai-affiliate')
-- ============================================================================
-- ROLLBACK SCRIPT:
-- BEGIN;
-- UPDATE tools
-- SET
--   features = jsonb_set(
--     features,
--     '{lessons,0,is_free_preview}',
--     'false'::jsonb,
--     false
--   ),
--   updated_at = NOW()
-- WHERE slug = 'tiktok-ai-affiliate'
--   AND COALESCE((features->'lessons'->0->>'is_free_preview')::boolean, false) = true;
-- COMMIT;
-- ============================================================================

BEGIN;

UPDATE tools
SET
  features = jsonb_set(
    features,
    '{lessons,0,is_free_preview}',
    'true'::jsonb,
    false
  ),
  updated_at = NOW()
WHERE slug = 'tiktok-ai-affiliate'
  AND COALESCE((features->'lessons'->0->>'is_free_preview')::boolean, false) = false;

COMMIT;
