import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { notifyLicenseActivated } from '@/lib/telegram'
import { getCourseBundleToolIds, invalidateBundleSyncCache } from '@/lib/course-bundle'

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
      .select('id, name, password, is_active, is_coming_soon')

    const matchedPasswordTool = allTools?.find(
      (t: any) =>
        t.is_active &&
        !t.is_coming_soon &&
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

    // 2. Check if cleanCode is an existing License Key
    const normalizedKey = cleanCode.trim().toUpperCase()
    const { data: existingKey } = await supabaseAdmin
      .from('license_keys')
      .select('id, key_code, tool_id, status, activated_by, activated_email, tools(id, name, slug, is_active, is_coming_soon)')
      .ilike('key_code', normalizedKey)
      .maybeSingle()

    const bundleInfo = await getCourseBundleToolIds(supabaseAdmin)
    const isBundleTool = existingKey?.tool_id ? bundleInfo.bundleIds.includes(existingKey.tool_id) : false
    const targetToolIds = isBundleTool
      ? bundleInfo.bundleIds
      : existingKey?.tool_id
      ? [existingKey.tool_id]
      : []

    if (existingKey && existingKey.status === 'activated') {
      const linkedTool = (existingKey as any).tools
      if (linkedTool && (!linkedTool.is_active || linkedTool.is_coming_soon)) {
        return NextResponse.json(
          { success: false, error: 'เครื่องมือนี้ปิดปรับปรุงชั่วคราว' },
          { status: 403 }
        )
      }

      const isSameUser =
        existingKey.activated_by === user.id ||
        (existingKey.activated_email &&
          user.email &&
          existingKey.activated_email.toLowerCase() === user.email.toLowerCase())

      if (isSameUser && existingKey.tool_id) {
        // Auto-heal user_tools (and full bundle if applicable) in case it was missing or inactive
        await supabaseAdmin.from('user_tools').upsert(
          targetToolIds.map((tid) => ({
            user_id: user.id,
            tool_id: tid,
            license_key_id: existingKey.id,
            is_active: true,
          })),
          { onConflict: 'user_id,tool_id' }
        )
        if (!existingKey.activated_by) {
          await supabaseAdmin
            .from('license_keys')
            .update({ activated_by: user.id, activated_email: user.email })
            .eq('id', existingKey.id)
        }
        invalidateBundleSyncCache(user.id)

        const toolName = linkedTool?.name || 'เครื่องมือของคุณ'
        const bundleSuffix = isBundleTool ? ' (พร้อมปลดล็อกเครื่องมือ AI ในชุดคอร์สครบทั้ง 3 รายการ)' : ''
        return NextResponse.json({
          success: true,
          alreadyOwned: true,
          isBundle: isBundleTool,
          unlockedToolIds: targetToolIds,
          tool_name: toolName,
          message: `✅ บัญชีของคุณมีสิทธิ์ "${toolName}"${bundleSuffix} อยู่แล้ว! กดปุ่มเปิดใช้งานด้านบนได้เลยครับ`,
        })
      }

      if (existingKey.activated_email) {
        const masked = maskEmail(existingKey.activated_email)
        return NextResponse.json(
          {
            success: false,
            error: `💡 รหัสนี้ถูกผูกไว้กับอีเมล ${masked} แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลดังกล่าวเพื่อใช้งานทันที (ไม่ต้องซื้อใหม่ครับ)`,
          },
          { status: 403 }
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
          await supabaseAdmin
            .from('license_keys')
            .update({ activated_email: user.email, activated_by: user.id })
            .eq('id', existingKey.id)

          if (targetToolIds.length > 0) {
            await supabaseAdmin.from('user_tools').upsert(
              targetToolIds.map((tid) => ({
                user_id: user.id,
                tool_id: tid,
                license_key_id: existingKey.id,
                is_active: true,
              })),
              { onConflict: 'user_id,tool_id' }
            )
            await supabaseAdmin
              .from('user_trials')
              .update({ status: 'converted' })
              .eq('user_id', user.id)
              .in('tool_id', targetToolIds)
              .eq('status', 'active')
          }
        }
        invalidateBundleSyncCache(user.id)
        notifyLicenseActivated(user.email || '', (data as any).tool_name || 'ไม่ระบุ', normalizedKey)
      }
      return NextResponse.json({
        ...(data as object),
        isBundle: isBundleTool,
        unlockedToolIds: targetToolIds,
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
