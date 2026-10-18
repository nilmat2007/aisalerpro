import { createClient } from '@/lib/supabase/server';
import CoursesClient from './CoursesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'คอร์สนายหน้า TikTok ด้วย AI ปักตะกร้า | PUP PAP AI',
  description: '16 บทเรียนวิดีโอแนวนอน 16:9 สเต็ปบายสเต็ป ตั้งแต่เริ่มต้นจนถึงปั๊มยอดขายและสเกล 100 คลิป/สัปดาห์',
};

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the course tool
  const { data: course } = await supabase
    .from('tools')
    .select('*')
    .eq('slug', 'tiktok-ai-affiliate')
    .maybeSingle();

  let hasAccess = false;

  const ADMIN_EMAILS = ['nilmat2007@gmail.com', 'nilmat200757@gmail.com'];

  if (user && course) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isTrueAdmin =
      profile?.role === 'admin' &&
      ADMIN_EMAILS.includes((user.email || '').toLowerCase());

    if (isTrueAdmin) {
      hasAccess = true;
    } else {
      const { data: userTool } = await supabase
        .from('user_tools')
        .select('id')
        .eq('user_id', user.id)
        .eq('tool_id', course.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userTool) {
        hasAccess = true;
      } else if (user.email) {
        const [{ data: keyMatch }, { data: orderMatch }] = await Promise.all([
          supabase
            .from('license_keys')
            .select('id')
            .eq('tool_id', course.id)
            .eq('status', 'activated')
            .ilike('activated_email', user.email)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('orders')
            .select('id')
            .eq('tool_id', course.id)
            .eq('status', 'approved')
            .ilike('user_email', user.email)
            .limit(1)
            .maybeSingle(),
        ]);

        if (keyMatch || orderMatch) {
          await supabase.from('user_tools').upsert(
            {
              user_id: user.id,
              tool_id: course.id,
              unlocked_at: new Date().toISOString(),
              is_active: true,
            },
            { onConflict: 'user_id,tool_id' }
          );
          hasAccess = true;
        }
      }
    }
  }

  return (
    <CoursesClient
      course={course}
      hasAccess={hasAccess}
      user={user}
    />
  );
}
