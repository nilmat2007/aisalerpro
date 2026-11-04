import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ADMIN_TOOL_SELECT_COLUMNS } from '@/lib/sanitize-tool';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: course, error } = await supabase
    .from('tools')
    .select(ADMIN_TOOL_SELECT_COLUMNS)
    .eq('slug', 'tiktok-ai-affiliate')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(course);
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { lessons, price, description, name } = body;

    const { data: currentCourse } = await supabase
      .from('tools')
      .select('features')
      .eq('slug', 'tiktok-ai-affiliate')
      .single();

    const currentFeatures = (typeof currentCourse?.features === 'object' && currentCourse?.features !== null)
      ? currentCourse.features
      : {};

    const updatedFeatures = {
      ...currentFeatures,
      lessons: lessons || currentFeatures.lessons || [],
      total_lessons: lessons ? lessons.length : currentFeatures.total_lessons,
    };

    const updatePayload: any = {
      features: updatedFeatures,
      updated_at: new Date().toISOString(),
    };

    if (price !== undefined) updatePayload.price = price;
    if (description !== undefined) updatePayload.description = description;
    if (name !== undefined) updatePayload.name = name;

    const { data, error } = await supabase
      .from('tools')
      .update(updatePayload)
      .eq('slug', 'tiktok-ai-affiliate')
      .select(ADMIN_TOOL_SELECT_COLUMNS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
