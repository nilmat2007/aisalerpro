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

  if (isDemoParam) {
    hasAccess = true;
  } else if (user) {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
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
