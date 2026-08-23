import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

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
        .select('*')
        .eq('username', username)
        .limit(1);

      if (!queryError && users && users.length > 0) {
        const user = users[0];
        // ลองเทียบ plain text ก่อน
        if (user.password_hash === password) {
          isValid = true;
        }
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const token = await createToken({ username, role: 'admin' });
    
    const cookieStore = await cookies();
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
  cookieStore.delete('admin_token');
  return NextResponse.json({ success: true });
}
