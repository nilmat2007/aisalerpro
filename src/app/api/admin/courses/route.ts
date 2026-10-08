import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: course, error } = await supabase
    .from('tools')
    .select('*')
    .eq('slug', 'tiktok-ai-affiliate')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(course);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
