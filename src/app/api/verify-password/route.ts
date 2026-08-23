import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { toolId, password } = await request.json();

    const { data: tool, error } = await supabase
      .from('tools')
      .select('password')
      .eq('id', toolId)
      .single();

    if (error || !tool) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    if (tool.password === password) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false });
    }
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
