import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { toolId, password } = await request.json();
    const cleanInput = String(password || '').trim();

    if (!toolId || !cleanInput) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกรหัสปลดล็อก' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: tool, error } = await supabase
      .from('tools')
      .select('id, name, password')
      .eq('id', toolId)
      .single();

    if (error || !tool) {
      return NextResponse.json({ success: false, error: 'ไม่พบเครื่องมือนี้' }, { status: 404 });
    }

    // 1. Check legacy password (case-insensitive)
    const isPasswordMatch =
      tool.password &&
      tool.password !== 'none' &&
      tool.password.trim().toLowerCase() === cleanInput.toLowerCase();

    if (isPasswordMatch) {
      // If user is logged in, permanently bind this tool to their account!
      if (user) {
        await supabase.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: tool.id,
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        );
      }
      return NextResponse.json({
        success: true,
        boundToAccount: Boolean(user),
      });
    }

    // 2. Check if user entered a License Key (PHM-XXXX-XXXX) into the password box
    const normalizedKey = cleanInput.toUpperCase();
    const { data: licenseKey } = await supabase
      .from('license_keys')
      .select('*')
      .ilike('key_code', normalizedKey)
      .maybeSingle();

    if (licenseKey) {
      const matchesTool = !licenseKey.tool_id || licenseKey.tool_id === tool.id;
      if (!matchesTool) {
        return NextResponse.json({
          success: false,
          error: 'รหัส License Key นี้เป็นของเครื่องมืออื่น กรุณานำไปกรอกที่หน้าแดชบอร์ดหลักครับ',
        });
      }

      if (licenseKey.status === 'unused') {
        if (user) {
          await supabase.rpc('activate_license', {
            p_key_code: normalizedKey,
            p_user_id: user.id,
          });
          await supabase
            .from('license_keys')
            .update({ activated_by: user.id, activated_email: user.email })
            .eq('id', licenseKey.id);
        }
        return NextResponse.json({
          success: true,
          boundToAccount: Boolean(user),
        });
      }

      if (licenseKey.status === 'activated') {
        // If logged in as the owner or if not logged in but verifying key ownership
        const isSameUser =
          !user ||
          licenseKey.activated_by === user.id ||
          (licenseKey.activated_email &&
            user.email &&
            licenseKey.activated_email.toLowerCase() === user.email.toLowerCase());

        if (isSameUser) {
          if (user) {
            await supabase.from('user_tools').upsert(
              {
                user_id: user.id,
                tool_id: tool.id,
                license_key_id: licenseKey.id,
                is_active: true,
              },
              { onConflict: 'user_id,tool_id' }
            );
          }
          return NextResponse.json({
            success: true,
            boundToAccount: Boolean(user),
          });
        }
      }
    }

    return NextResponse.json({
      success: false,
      error: '❌ รหัสไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านหรือ License Key อีกครั้ง',
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
