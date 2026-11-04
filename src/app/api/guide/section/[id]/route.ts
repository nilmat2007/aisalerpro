import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth/require-admin';

const SECTION_COLUMNS = 'id, tool_id, title, icon, description, sort_order, style_variant, created_at, updated_at';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const resolvedParams = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('guide_sections')
      .update(body)
      .eq('id', resolvedParams.id)
      .select(SECTION_COLUMNS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const resolvedParams = await params;
  const { error } = await supabase
    .from('guide_sections')
    .delete()
    .eq('id', resolvedParams.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
