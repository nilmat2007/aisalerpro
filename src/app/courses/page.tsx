import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';
import CoursesClient from './CoursesClient';
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type PublicTool,
  type Tool,
} from '@/lib/sanitize-tool';
import {
  resolveUserBundleAccess,
  attemptCourseBundleHeal,
} from '@/lib/course-bundle';
import { isAdminBypassActiveForEmail } from '@/lib/ai-slip-config';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'คอร์สนายหน้า TikTok ด้วย AI ปักตะกร้า | PUP PAP AI',
  description: '22 บทเรียนวิดีโอแนวนอน 16:9 สเต็ปบายสเต็ป ตั้งแต่เริ่มต้น เจาะลึก Google Flow ตัวใหม่ จนถึงปั๊มยอดขายและสเกล 100 คลิป/สัปดาห์',
};

export default async function CoursesPage() {
  const supabase = await createClient();
  const [
    { data: { user } },
    { data: course },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('tools')
      .select(PUBLIC_TOOL_SELECT_COLUMNS)
      .eq('slug', 'tiktok-ai-affiliate')
      .maybeSingle(),
  ]);

  let hasAccess = false;

  if (user && course) {
    const [adminBypass, bundleAccess] = await Promise.all([
      isAdminBypassActiveForEmail(user.email),
      resolveUserBundleAccess(supabaseAdmin, user.id, user.email || ''),
    ]);

    if (adminBypass || bundleAccess.ownedToolIds.includes(course.id)) {
      hasAccess = true;
    }

    if (bundleAccess.needsBackgroundSync) {
      await attemptCourseBundleHeal(supabaseAdmin, user.id, user.email || '');
    }
  }

  const sanitizedCourse: PublicTool | null = course
    ? sanitizeToolForPublic(course as unknown as Tool, {
        session: null,
        hasAccess,
        isTrial: false,
      })
    : null;

  return (
    <CoursesClient
      course={sanitizedCourse}
      hasAccess={hasAccess}
      user={user}
    />
  );
}
