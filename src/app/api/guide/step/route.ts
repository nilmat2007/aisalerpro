import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth/require-admin';

const STEP_COLUMNS = 'id, section_id, step_number, label, title, content, sub_items, image_urls, image_caption, highlight_style, code_block, sort_order, created_at, updated_at';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('guide_steps')
      .insert(body)
      .select(STEP_COLUMNS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
