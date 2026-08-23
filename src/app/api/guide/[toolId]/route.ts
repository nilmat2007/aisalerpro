import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const resolvedParams = await params;
  
  const { data: sections, error: sectionsError } = await supabase
    .from('guide_sections')
    .select('*')
    .eq('tool_id', resolvedParams.toolId)
    .order('sort_order', { ascending: true });

  if (sectionsError) return NextResponse.json({ error: sectionsError.message }, { status: 500 });

  if (!sections || sections.length === 0) return NextResponse.json([]);

  const sectionIds = sections.map(s => s.id);
  const { data: steps, error: stepsError } = await supabase
    .from('guide_steps')
    .select('*')
    .in('section_id', sectionIds)
    .order('sort_order', { ascending: true });

  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });

  const result = sections.map(section => ({
    ...section,
    steps: steps?.filter(step => step.section_id === section.id) || []
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const resolvedParams = await params;
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('guide_sections')
      .insert({ ...body, tool_id: resolvedParams.toolId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
