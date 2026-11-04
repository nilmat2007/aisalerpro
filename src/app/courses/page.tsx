import { createClient } from '@/lib/supabase/server';
import CoursesClient from './CoursesClient';
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type PublicTool,
  type Tool,
} from '@/lib/sanitize-tool';

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

  const ADMIN_EMAILS = ['nilmat2007@gmail.com', 'nilmat200757@gmail.com'];

  if (user && course) {
    const [{ data: profile }, { data: userTool }] = await Promise.all([
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('user_tools')
        .select('id')
        .eq('user_id', user.id)
        .eq('tool_id', course.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    const isTrueAdmin =
      profile?.role === 'admin' &&
      ADMIN_EMAILS.includes((user.email || '').toLowerCase());

    if (isTrueAdmin || userTool) {
      hasAccess = true;
    } else if (user.email) {
        const [{ data: keysList }, { data: orderMatch }] = await Promise.all([
          supabase
            .from('license_keys')
            .select('id, status')
            .eq('tool_id', course.id)
            .in('status', ['activated', 'revoked'])
            .ilike('activated_email', user.email),
          supabase
            .from('orders')
            .select('id, license_key_id')
            .eq('tool_id', course.id)
            .eq('status', 'approved')
            .ilike('user_email', user.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const activatedKey = (keysList || []).find((k: any) => k.status === 'activated');
        const revokedKeyIds = new Set(
          (keysList || []).filter((k: any) => k.status === 'revoked').map((k: any) => k.id)
        );
        const hasRevokedKeyOnly = !activatedKey && revokedKeyIds.size > 0;
        const validOrderMatch =
          orderMatch &&
          !hasRevokedKeyOnly &&
          (!orderMatch.license_key_id || !revokedKeyIds.has(orderMatch.license_key_id))
            ? orderMatch
            : null;

        if (activatedKey || validOrderMatch) {
          await supabase.from('user_tools').upsert(
            {
              user_id: user.id,
              tool_id: course.id,
              license_key_id: activatedKey?.id || validOrderMatch?.license_key_id || null,
              activated_at: new Date().toISOString(),
              is_active: true,
            },
            { onConflict: 'user_id,tool_id' }
          );
          hasAccess = true;
        }
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
