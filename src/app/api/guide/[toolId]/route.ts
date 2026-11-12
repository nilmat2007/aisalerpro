import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth/require-admin';

const SECTION_COLUMNS = 'id, tool_id, title, icon, description, sort_order, style_variant, created_at, updated_at';
const STEP_COLUMNS = 'id, section_id, step_number, label, title, content, sub_items, image_urls, image_caption, highlight_style, code_block, sort_order, created_at, updated_at';

export async function GET(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const resolvedParams = await params;
  
  const { data: sections, error: sectionsError } = await supabase
    .from('guide_sections')
    .select(SECTION_COLUMNS)
    .eq('tool_id', resolvedParams.toolId)
    .order('sort_order', { ascending: true });

  if (sectionsError) return NextResponse.json({ error: sectionsError.message }, { status: 500 });

  if (!sections || sections.length === 0) return NextResponse.json([]);

  const sectionIds = sections.map(s => s.id);
  const { data: steps, error: stepsError } = await supabase
    .from('guide_steps')
    .select(STEP_COLUMNS)
    .in('section_id', sectionIds)
    .order('sort_order', { ascending: true });

  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });

  const result = sections.map(section => ({
    ...section,
    steps: (steps?.filter(step => step.section_id === section.id) || []).map(step => {
      // Never leak raw Google Flow / Labs URLs in public guide_steps.code_block
      if (
        section.style_variant !== 'video' &&
        typeof step.code_block === 'string' &&
        (step.code_block.includes('flow.google.com') || step.code_block.includes('labs.google'))
      ) {
        return { ...step, code_block: 'LOCKED_FLOW_LINK' };
      }
      return step;
    }),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const resolvedParams = await params;
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('guide_sections')
      .insert({ ...body, tool_id: resolvedParams.toolId })
      .select(SECTION_COLUMNS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
