import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeToolForPublic,
  getToolTutorialEmbedUrl,
  mergePreservedSensitiveToolFields,
  type Tool,
} from '@/lib/sanitize-tool';
import {
  FASHION_GUIDE_SECTIONS,
  UGC_PRODUCT_GUIDE_SECTIONS,
} from '../../scripts/backfill-course-bundle.mjs';

const MOCK_FASHION_TOOL: Tool = {
  id: '5fa1de55-2b29-4c48-924c-97bff74b2419',
  name: 'PUP PAP Fashion Studio',
  slug: 'puppap-fashion-studio',
  icon: '👗',
  poster_url: '/images/poster-puppap-fashion-studio.jpg',
  logo_url: '/images/poster-puppap-fashion-studio.jpg',
  password: 'SECRET_PASSWORD_123',
  description: 'Fashion AI Tool',
  price: '299',
  badge_text: '🎁 แถมฟรีในคอร์ส ฿299',
  badge_color: 'pink',
  version: '1.0.0',
  is_active: true,
  is_coming_soon: false,
  sort_order: 2,
  flow_url: 'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc',
  trial_enabled: true,
  trial_flow_url: 'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc',
  demo_video_url: 'https://drive.google.com/file/d/15sLvHbTux0cO32NbKeE7E7mIcmsBxs9H/preview',
  features: {
    category: 'flow_tool',
    original_price: '990',
    bundle_with_course: 'tiktok-ai-affiliate',
    guide_drive_url: 'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link',
    tutorial_video_url: 'https://drive.google.com/file/d/15sLvHbTux0cO32NbKeE7E7mIcmsBxs9H/preview',
  },
};

describe('Tool Embedded Video Player & Under-Video Guide Security Tests', () => {
  test('(ก) Guest does NOT receive demo_video_url or Google Drive File ID in sanitized JSON', () => {
    const guestTool = sanitizeToolForPublic(MOCK_FASHION_TOOL, {
      session: null,
      hasAccess: false,
      isTrial: false,
    });

    expect(guestTool).not.toHaveProperty('demo_video_url');
    expect(guestTool).not.toHaveProperty('flow_url');
    expect(guestTool).not.toHaveProperty('password');

    const serialized = JSON.stringify(guestTool);
    expect(serialized).not.toContain('15sLvHbTux0cO32NbKeE7E7mIcmsBxs9H');
    expect(serialized).not.toContain('7cd5fff0-d917-41c2-b530-acc8ae147dcc');
  });

  test('(ข) Both Guest and Unlocked Member do NOT receive features.guide_drive_url (admin-only DB backup)', () => {
    const guestTool = sanitizeToolForPublic(MOCK_FASHION_TOOL, {
      session: null,
      hasAccess: false,
      isTrial: false,
    });
    const memberTool = sanitizeToolForPublic(MOCK_FASHION_TOOL, {
      session: null,
      hasAccess: true,
      isTrial: false,
    });

    expect((guestTool.features as any)?.guide_drive_url).toBeUndefined();
    expect((memberTool.features as any)?.guide_drive_url).toBeUndefined();
    expect(JSON.stringify(guestTool)).not.toContain('1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA');
    expect(JSON.stringify(memberTool)).not.toContain('1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA');
  });

  test('(ค) Unlocked Member (hasAccess=true) receives demo_video_url and getToolTutorialEmbedUrl formats /preview', () => {
    const memberTool = sanitizeToolForPublic(MOCK_FASHION_TOOL, {
      session: null,
      hasAccess: true,
      isTrial: false,
    });

    expect(memberTool.demo_video_url).toBe(
      'https://drive.google.com/file/d/15sLvHbTux0cO32NbKeE7E7mIcmsBxs9H/preview'
    );
    expect(
      getToolTutorialEmbedUrl(
        'https://drive.google.com/file/d/11aHTA5eEu0YIaWM8GQDP-IBUeGkZ0tUT/view?usp=sharing'
      )
    ).toBe('https://drive.google.com/file/d/11aHTA5eEu0YIaWM8GQDP-IBUeGkZ0tUT/preview');
    expect(getToolTutorialEmbedUrl('locked')).toBe('');
    expect(getToolTutorialEmbedUrl('')).toBe('');
  });

  test('(ง) mergePreservedSensitiveToolFields prevents PUT /api/tools/[id] from overwriting real video_url, prompts, or guide_drive_url with sanitized placeholders', () => {
    const existingCourseInDb = {
      id: 'course-1',
      slug: 'tiktok-ai-affiliate',
      flow_url: 'https://flow.google.com/shared/tool/real-flow',
      demo_video_url: 'https://drive.google.com/file/d/REAL_DEMO_ID/preview',
      password: 'REAL_PASSWORD',
      features: {
        guide_drive_url:
          'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link',
        bundle_bonus_slugs: ['puppap-fashion-studio', 'puppap-ugc-product'],
        lessons: [
          {
            id: 1,
            title: 'บทที่ 1',
            video_url: 'https://drive.google.com/file/d/176lrTuyL191x7iMBykblw-D_ZXu7urS8/preview',
            is_free_preview: true,
            prompts: [{ step: 'Step 1', prompt: 'REAL_PROMPT_1' }],
          },
          {
            id: 14,
            title: 'วิธีทำคลิปมินิมอลปักตะกร้า',
            video_url: 'https://drive.google.com/file/d/REAL_LESSON_14_DRIVE_ID/preview',
            is_free_preview: false,
            flow_tool_slug: 'puppap-ugc-product',
            prompts: [{ step: 'Step 14', prompt: 'REAL_PROMPT_14' }],
          },
        ],
      },
    };

    // Simulate a payload coming from a client that accidentally held sanitized lesson placeholders
    const incomingSanitizedSavePayload = {
      name: 'คอร์สนายหน้า TikTok ด้วย AI (อัปเดตชื่อ)',
      flow_url: null,
      password: 'none',
      features: {
        category: 'course',
        lessons: [
          {
            id: 1,
            title: 'บทที่ 1',
            video_url: 'https://drive.google.com/file/d/176lrTuyL191x7iMBykblw-D_ZXu7urS8/preview',
            is_free_preview: true,
            prompts: null,
          },
          {
            id: 14,
            title: 'วิธีทำคลิปมินิมอลปักตะกร้า',
            video_url: 'locked',
            is_free_preview: false,
            prompts: null,
          },
        ],
      },
    };

    const merged = mergePreservedSensitiveToolFields(
      existingCourseInDb,
      incomingSanitizedSavePayload
    );

    expect(merged.flow_url).toBe('https://flow.google.com/shared/tool/real-flow');
    expect(merged.demo_video_url).toBe('https://drive.google.com/file/d/REAL_DEMO_ID/preview');
    expect(merged.password).toBe('REAL_PASSWORD');
    expect(merged.features.guide_drive_url).toBe(
      'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link'
    );
    expect(merged.features.lessons[1].video_url).toBe(
      'https://drive.google.com/file/d/REAL_LESSON_14_DRIVE_ID/preview'
    );
    expect(merged.features.lessons[1].prompts).toEqual([
      { step: 'Step 14', prompt: 'REAL_PROMPT_14' },
    ]);
    expect(merged.features.lessons[1].flow_tool_slug).toBe('puppap-ugc-product');
  });

  test('(จ) Guide sections match the .txt files and contain zero Google Drive folder links in UI or steps', () => {
    expect(FASHION_GUIDE_SECTIONS).toHaveLength(3);
    expect(UGC_PRODUCT_GUIDE_SECTIONS).toHaveLength(4);

    const allGuideJson = JSON.stringify({
      FASHION_GUIDE_SECTIONS,
      UGC_PRODUCT_GUIDE_SECTIONS,
    });
    expect(allGuideJson).not.toContain('drive.google.com/drive/folders');
    expect(allGuideJson).not.toContain('1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA');
    expect(allGuideJson).toContain('Safe Storyline Shield');
    expect(allGuideJson).toContain('Strict Product Lock');

    const toolGuideClientCode = fs.readFileSync(
      path.join(process.cwd(), 'src/app/tool/[slug]/ToolGuideClient.tsx'),
      'utf8'
    );
    expect(toolGuideClientCode).not.toContain('guideDriveUrl');
    expect(toolGuideClientCode).not.toContain('1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA');
    expect(toolGuideClientCode).toContain('PUP PAP AI Embedded Video Player');
  });
});
