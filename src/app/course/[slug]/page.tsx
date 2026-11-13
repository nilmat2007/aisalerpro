import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import CourseStudioClient from './CourseStudioClient';
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeLessonForPublic,
  sanitizeToolForPublic,
  type Lesson,
  type PublicLesson,
  type PublicTool,
  type Tool,
} from '@/lib/sanitize-tool';
import {
  resolveUserBundleAccess,
  attemptCourseBundleHeal,
} from '@/lib/course-bundle';
import { isAdminBypassActiveForEmail } from '@/lib/ai-slip-config';

export const dynamic = 'force-dynamic';

export default async function CoursePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const supabase = await createClient();

  const [
    { data: { user } },
    { data: tool },
    { data: activeTools },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('tools')
      .select(PUBLIC_TOOL_SELECT_COLUMNS)
      .eq('slug', slug)
      .single(),
    supabase
      .from('tools')
      .select('slug, is_active, is_coming_soon')
      .eq('is_active', true),
  ]);

  if (!tool) {
    redirect('/courses');
  }

  const activeToolSlugs = (activeTools || [])
    .filter(
      (t: any) =>
        t.is_active &&
        !t.is_coming_soon &&
        t.slug !== 'tiktok-ai-affiliate' &&
        t.slug !== 'puppap-all-in-one'
    )
    .map((t: any) => t.slug);

  let hasAccess = false;

  if (user) {
    const [adminBypass, { data: userTool }, bundleAccess] = await Promise.all([
      isAdminBypassActiveForEmail(user.email),
      supabase
        .from('user_tools')
        .select('id')
        .eq('user_id', user.id)
        .eq('tool_id', tool.id)
        .eq('is_active', true)
        .maybeSingle(),
      resolveUserBundleAccess(supabaseAdmin, user.id, user.email || ''),
    ]);

    if (adminBypass || userTool || bundleAccess.ownedToolIds.includes(tool.id)) {
      hasAccess = true;
    }

    if (bundleAccess.needsBackgroundSync) {
      await attemptCourseBundleHeal(supabaseAdmin, user.id, user.email || '');
    }
  }

  const sanitizedTool: PublicTool = sanitizeToolForPublic(tool as unknown as Tool, {
    session: null,
    hasAccess,
    isTrial: false,
  });

  if (
    sanitizedTool.features &&
    typeof sanitizedTool.features === 'object' &&
    !Array.isArray(sanitizedTool.features) &&
    Array.isArray(sanitizedTool.features.lessons)
  ) {
    const rawLessons: Lesson[] = Array.isArray((tool as any)?.features?.lessons)
      ? (tool as any).features.lessons
      : sanitizedTool.features.lessons;
    const sanitizedLessons: PublicLesson[] = rawLessons.map((lesson: Lesson) =>
      sanitizeLessonForPublic(lesson, {
        hasAccess,
        isFreePreview: Boolean(lesson?.is_free_preview),
      })
    );
    sanitizedTool.features = {
      ...sanitizedTool.features,
      lessons: sanitizedLessons,
    };
  }

  return (
    <CourseStudioClient
      tool={sanitizedTool}
      hasAccess={hasAccess}
      user={user}
      activeToolSlugs={activeToolSlugs}
    />
  );
}
