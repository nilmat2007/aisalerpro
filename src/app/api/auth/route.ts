import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body || {};

    // ใช้ RPC verify_admin (ถ้ามี) หรือ fallback เป็น plain query
    let isValid = false;

    // วิธี 1: ลอง RPC verify_admin ก่อน
    try {
      const { data, error } = await supabase.rpc('verify_admin', {
        p_username: username,
        p_password: password
      });
      if (!error && data && (Array.isArray(data) ? data.length > 0 : data === true)) {
        isValid = true;
      }
    } catch {
      // RPC ไม่มี ลองวิธีอื่น
    }

    // วิธี 2: ดึง admin user แล้วเทียบ password ตรงๆ (กรณี password เก็บแบบ plain text)
    if (!isValid) {
      const { data: users, error: queryError } = await supabase
        .from('admin_users')
        .select('id, username, password_hash')
        .eq('username', username)
        .limit(1);

      if (!queryError && users && users.length > 0) {
        const user = users[0];
        if (user.password_hash === password) {
          isValid = true;
        }
      }
    }

    const cookieStore = await cookies();

    if (!isValid) {
      cookieStore.set('admin_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const token = await createToken({ username, role: 'admin', is_admin: true });

    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return NextResponse.json({ success: true });
}
