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
        const [{ data: keysList }, { data: orderMatch }] = await Promise.all([
          supabase
            .from('license_keys')
            .select('id, status')
            .eq('tool_id', tool.id)
            .in('status', ['activated', 'revoked'])
            .ilike('activated_email', user.email),
          supabase
            .from('orders')
            .select('id, license_key_id')
            .eq('tool_id', tool.id)
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
              tool_id: tool.id,
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

  return (
    <CourseStudioClient
      tool={tool}
      hasAccess={hasAccess}
      user={user}
    />
  );
}
