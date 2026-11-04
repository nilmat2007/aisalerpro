import { describe, test, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let mockCurrentUser: { id: string; email: string } | null = null;
let mockHasUserToolAccess = false;

const MOCK_COURSE_TOOL = {
  id: 'course-tool-id',
  name: 'ปั้นนายหน้า TikTok ด้วย AI ปักตะกร้า',
  slug: 'tiktok-ai-affiliate',
  icon: '🎓',
  poster_url: null,
  logo_url: null,
  password: 'SUPER-SECRET-PASSWORD-999',
  description: 'คอร์สเรียน TikTok AI',
  price: '990',
  badge_text: 'BESTSELLER',
  badge_color: 'cyan',
  version: '2.0',
  is_active: true,
  is_coming_soon: false,
  sort_order: 1,
  flow_url: 'https://labs.google/fx/tools/flow/shared/tool/secret-flow-id',
  trial_enabled: true,
  trial_flow_url: 'https://labs.google/fx/tools/flow/shared/tool/secret-trial-flow-id',
  features: {
    total_lessons: 2,
    lessons: [
      {
        id: 1,
        slug: 'lesson-1-why-tiktok-affiliate',
        module_id: 1,
        module_title: 'โมดูล 1: ปูพื้นฐาน',
        title: 'ทำไมใครๆ ก็อยากเป็นนายหน้า TikTok',
        description: 'บทที่ 1 ดูฟรี',
        video_url: 'https://drive.google.com/file/d/FREE_PREVIEW_DRIVE_ID_111/preview',
        duration: '10:00 นาที',
        status: 'ready',
        is_free_preview: true,
        prompts: [],
      },
      {
        id: 2,
        slug: 'lesson-2-locked-secret',
        module_id: 2,
        module_title: 'โมดูล 2: Google Flow',
        title: 'บทเรียนลับเฉพาะสมาชิก',
        description: 'บทที่ 2 ล็อกสำหรับสมาชิก',
        video_url: 'https://drive.google.com/file/d/LOCKED_SECRET_DRIVE_ID_999/preview',
        duration: '15:00 นาที',
        status: 'ready',
        is_free_preview: false,
        prompts: [
          {
            step: 'สเต็ปที่ 1: สร้างภาพ',
            app: 'Google Flow',
            instruction: 'คัดลอกไปวาง',
            prompt: 'ULTRA_SECRET_MEMBER_ONLY_PROMPT_TEXT_XYZ_98765',
          },
        ],
      },
    ],
  },
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    getAll: () => [],
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'tools') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [MOCK_COURSE_TOOL], error: null }),
            eq: () => ({
              single: () => Promise.resolve({ data: MOCK_COURSE_TOOL, error: null }),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockCurrentUser },
        error: null,
      })),
    },
    from: (table: string) => {
      if (table === 'tools') {
        return {
          select: () => ({
            eq: (_col: string, val: any) => {
              if (val === true) {
                return Promise.resolve({ data: [MOCK_COURSE_TOOL], error: null });
              }
              return {
                single: () => Promise.resolve({ data: MOCK_COURSE_TOOL, error: null }),
                maybeSingle: () => Promise.resolve({ data: MOCK_COURSE_TOOL, error: null }),
              };
            },
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { role: 'member' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_tools') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: mockHasUserToolAccess ? { id: 'ut-1' } : null,
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'license_keys') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                ilike: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                ilike: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

import { GET as getTools } from '@/app/api/tools/route';
import { GET as getToolById } from '@/app/api/tools/[id]/route';
import CoursePage from '@/app/course/[slug]/page';

describe('Public Data Leak Prevention Tests', () => {
  beforeEach(() => {
    mockCurrentUser = null;
    mockHasUserToolAccess = false;
  });

  test('GET /api/tools ไม่มี key: password|flow_url|trial_flow_url', async () => {
    const res = await getTools();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    for (const item of data) {
      expect(item).not.toHaveProperty('password');
      expect(item).not.toHaveProperty('flow_url');
      expect(item).not.toHaveProperty('trial_flow_url');
    }
    const rawJson = JSON.stringify(data);
    expect(rawJson).not.toContain('SUPER-SECRET-PASSWORD-999');
    expect(rawJson).not.toContain('secret-flow-id');
    expect(rawJson).not.toContain('secret-trial-flow-id');
  });

  test('GET /api/tools/[id] guest ไม่มี flow_url', async () => {
    const req = new Request('http://localhost:3000/api/tools/course-tool-id');
    const res = await getToolById(req, { params: Promise.resolve({ id: 'course-tool-id' }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('flow_url');
    expect(data).not.toHaveProperty('trial_flow_url');
  });

  test('GET /course/[slug] guest: บทที่ locked ไม่มี drive.google.com ใน HTML', async () => {
    mockCurrentUser = null;
    mockHasUserToolAccess = false;

    const element = await CoursePage({
      params: Promise.resolve({ slug: 'tiktok-ai-affiliate' }),
    });
    const serializedProps = JSON.stringify(element.props);
    const html = renderToStaticMarkup(element as React.ReactElement);

    // Lesson 2 is locked -> its video_url must be 'locked' and its Drive ID must never appear in RSC props or HTML
    const lessons = element.props.tool.features.lessons;
    const lockedLesson = lessons.find((l: any) => !l.is_free_preview);
    expect(lockedLesson.video_url).toBe('locked');
    expect(lockedLesson.video_url).not.toContain('drive.google.com');
    expect(serializedProps).not.toContain('LOCKED_SECRET_DRIVE_ID_999');
    expect(html).not.toContain('LOCKED_SECRET_DRIVE_ID_999');
  });

  test('GET /course/[slug] guest: prompts ของบท locked ไม่อยู่ใน HTML', async () => {
    mockCurrentUser = null;
    mockHasUserToolAccess = false;

    const element = await CoursePage({
      params: Promise.resolve({ slug: 'tiktok-ai-affiliate' }),
    });
    const serializedProps = JSON.stringify(element.props);
    const html = renderToStaticMarkup(element as React.ReactElement);

    const lessons = element.props.tool.features.lessons;
    const lockedLesson = lessons.find((l: any) => !l.is_free_preview);
    expect(lockedLesson.prompts).toBeNull();
    expect(lockedLesson.promptStepCount).toBe(1);
    expect(serializedProps).not.toContain('ULTRA_SECRET_MEMBER_ONLY_PROMPT_TEXT_XYZ_98765');
    expect(html).not.toContain('ULTRA_SECRET_MEMBER_ONLY_PROMPT_TEXT_XYZ_98765');
  });

  test('GET /course/[slug] member: เห็น video_url + prompts ครบ', async () => {
    mockCurrentUser = { id: 'member-1', email: 'member@example.com' };
    mockHasUserToolAccess = true;

    const element = await CoursePage({
      params: Promise.resolve({ slug: 'tiktok-ai-affiliate' }),
    });
    const serializedProps = JSON.stringify(element.props);

    const lessons = element.props.tool.features.lessons;
    const lockedLesson = lessons.find((l: any) => l.id === 2);
    expect(lockedLesson.video_url).toContain('drive.google.com/file/d/LOCKED_SECRET_DRIVE_ID_999');
    expect(Array.isArray(lockedLesson.prompts)).toBe(true);
    expect(lockedLesson.prompts[0].prompt).toBe(
      'ULTRA_SECRET_MEMBER_ONLY_PROMPT_TEXT_XYZ_98765'
    );
    expect(serializedProps).toContain('LOCKED_SECRET_DRIVE_ID_999');
    expect(serializedProps).toContain('ULTRA_SECRET_MEMBER_ONLY_PROMPT_TEXT_XYZ_98765');
  });
});
