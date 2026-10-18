import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CourseStudioClient from './CourseStudioClient';

export const dynamic = 'force-dynamic';

export default async function CoursePage(props: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isDemoParam = searchParams?.demo === '1' || searchParams?.preview === '1';

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch course tool
  const { data: tool } = await supabase
    .from('tools')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!tool) {
    redirect('/courses');
  }

  let hasAccess = false;

  const ADMIN_EMAILS = ['nilmat2007@gmail.com', 'nilmat200757@gmail.com'];

  if (isDemoParam) {
    hasAccess = true;
  } else if (user) {
    // Check if user is admin
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
      // Check user_tools
      const { data: userTool } = await supabase
        .from('user_tools')
        .select('id')
        .eq('user_id', user.id)
        .eq('tool_id', tool.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userTool) {
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
  }

  return (
    <CourseStudioClient
      tool={tool}
      hasAccess={hasAccess}
      user={user}
      initialDemoMode={isDemoParam}
    />
  );
}
