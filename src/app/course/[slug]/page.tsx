import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CourseStudioClient from './CourseStudioClient';

export const dynamic = 'force-dynamic';

export default async function CoursePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const supabase = await createClient();

  const [
    { data: { user } },
    { data: tool },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('tools')
      .select('*')
      .eq('slug', slug)
      .single(),
  ]);

  if (!tool) {
    redirect('/courses');
  }

  let hasAccess = false;

  const ADMIN_EMAILS = ['nilmat2007@gmail.com', 'nilmat200757@gmail.com'];

  if (user) {
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
        .eq('tool_id', tool.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    const isTrueAdmin =
      profile?.role === 'admin' &&
      ADMIN_EMAILS.includes((user.email || '').toLowerCase());

    if (isTrueAdmin || userTool) {
      hasAccess = true;
    } else if (user.email) {
        const [{ data: keyMatch }, { data: orderMatch }] = await Promise.all([
          supabase
            .from('license_keys')
            .select('id')
            .eq('tool_id', tool.id)
            .eq('status', 'activated')
            .ilike('activated_email', user.email)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('orders')
            .select('id')
            .eq('tool_id', tool.id)
            .eq('status', 'approved')
            .ilike('user_email', user.email)
            .limit(1)
            .maybeSingle(),
        ]);

        if (keyMatch || orderMatch) {
          await supabase.from('user_tools').upsert(
            {
              user_id: user.id,
              tool_id: tool.id,
              unlocked_at: new Date().toISOString(),
              is_active: true,
            },
            { onConflict: 'user_id,tool_id' }
          );
          hasAccess = true;
        }
    }
  }

  return (
    <CourseStudioClient
      tool={tool}
      hasAccess={hasAccess}
      user={user}
    />
  );
}
