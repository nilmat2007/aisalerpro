import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || {});
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    
    // Assuming we update the first row or the row with a specific ID
    const { data, error } = await supabase
      .from('site_settings')
      .update(body)
      .eq('id', body.id || 1)
      .select()
      .single();

    if (error) {
      // Attempt insert/upsert if record doesn't exist
      const { data: upsertData, error: upsertError } = await supabase
        .from('site_settings')
        .upsert({ id: body.id || 1, ...body })
        .select()
        .single();
      
      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
      return NextResponse.json(upsertData);
    }
    
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
