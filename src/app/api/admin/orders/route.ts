import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, user_id, user_email, tool_id, package_type, amount, slip_url, status, admin_note, license_key_id, created_at, approved_at, approved_by, tools(name, slug, price)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
