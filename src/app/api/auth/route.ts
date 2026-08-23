import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // We assume a Postgres function (RPC) named 'verify_admin' is created in Supabase to run:
    // SELECT * FROM admin_users WHERE username = $1 AND password_hash = crypt($2, password_hash)
    const { data, error } = await supabase.rpc('verify_admin', {
      p_username: username,
      p_password: password
    });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await createToken({ username, role: 'admin' });
    
    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  return NextResponse.json({ success: true });
}
