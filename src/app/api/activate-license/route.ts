import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyLicenseActivated } from '@/lib/telegram'

function maskEmail(email: string): string {
  const parts = email.split('@')
  if (parts.length !== 2) return email
  const [local, domain] = parts
  if (local.length <= 3) return `${local[0] || ''}***@${domain}`
  return `${local.slice(0, 3)}***${local.slice(-1)}@${domain}`
}

export async function POST(request: NextRequest) {
  try {
    const { keyCode } = await request.json()
    const cleanCode = String(keyCode || '').trim()
    if (!cleanCode) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสปลดล็อก' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 })
    }

    // Ensure profile exists (in case trigger didn't fire)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role: 'member',
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      })
    }

    // 1. Check if cleanCode matches a legacy tool password (e.g., PRO888, NEW999)
    const { data: allTools } = await supabase
      .from('tools')
      .select('id, name, password')

    const matchedPasswordTool = allTools?.find(
      (t: any) =>
        t.password &&
        t.password !== 'none' &&
        t.password.trim().toLowerCase() === cleanCode.toLowerCase()
    )

    if (matchedPasswordTool) {
      await supabase.from('user_tools').upsert(
        {
          user_id: user.id,
          tool_id: matchedPasswordTool.id,
          is_active: true,
        },
        { onConflict: 'user_id,tool_id' }
      )

      return NextResponse.json({
        success: true,
        tool_name: matchedPasswordTool.name,
        message: `✅ ปลดล็อก "${matchedPasswordTool.name}" และผูกสิทธิ์กับบัญชี ${user.email} ถาวรเรียบร้อยแล้ว!`,
      })
    }

    // 2. Check if cleanCode is an existing License Key (handle already-activated keys gracefully)
    const normalizedKey = cleanCode.toUpperCase()
    const { data: existingKey } = await supabase
      .from('license_keys')
      .select('*, tools(id, name)')
      .ilike('key_code', normalizedKey)
      .maybeSingle()

    if (existingKey && existingKey.status === 'activated') {
      const isSameUser =
        existingKey.activated_by === user.id ||
        (existingKey.activated_email &&
          user.email &&
          existingKey.activated_email.toLowerCase() === user.email.toLowerCase())

      if (isSameUser && existingKey.tool_id) {
        // Auto-heal user_tools in case it was missing or inactive
        await supabase.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: existingKey.tool_id,
            license_key_id: existingKey.id,
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        )
        if (!existingKey.activated_by) {
          await supabase
            .from('license_keys')
            .update({ activated_by: user.id, activated_email: user.email })
            .eq('id', existingKey.id)
        }

        const toolName = (existingKey as any).tools?.name || 'เครื่องมือของคุณ'
        return NextResponse.json({
          success: true,
          alreadyOwned: true,
          tool_name: toolName,
          message: `✅ บัญชีของคุณมีสิทธิ์ "${toolName}" อยู่แล้ว! กดปุ่มเปิดใช้งานด้านบนได้เลยครับ`,
        })
      }

      if (existingKey.activated_email) {
        const masked = maskEmail(existingKey.activated_email)
        return NextResponse.json(
          {
            success: false,
            error: `💡 รหัสนี้ถูกผูกไว้กับอีเมล ${masked} แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลดังกล่าวเพื่อใช้งานทันที (ไม่ต้องซื้อใหม่ครับ)`,
          },
          { status: 400 }
        )
      }
    }

    // 3. Standard RPC activation for unused License Keys
    const { data, error } = await supabase.rpc('activate_license', {
      p_key_code: normalizedKey,
      p_user_id: user.id
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    if (data && typeof data === 'object') {
      if ((data as any).success) {
        if (existingKey?.id) {
          await supabase
            .from('license_keys')
            .update({ activated_email: user.email, activated_by: user.id })
            .eq('id', existingKey.id)
        }
        notifyLicenseActivated(user.email || '', (data as any).tool_name || 'ไม่ระบุ', normalizedKey)
      }
      return NextResponse.json(data)
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
