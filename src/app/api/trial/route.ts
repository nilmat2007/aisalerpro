import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { notifyTrialStarted } from '@/lib/telegram'
import { getCourseBundleToolIds } from '@/lib/course-bundle'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function computeEffectiveExpiresAt(trial: any): string {
  if (trial?.expires_at) return trial.expires_at
  const startMs = trial?.started_at
    ? new Date(trial.started_at).getTime()
    : trial?.created_at
    ? new Date(trial.created_at).getTime()
    : Date.now()
  return new Date(startMs + SEVEN_DAYS_MS).toISOString()
}

function isTrialExpired(trial: any): boolean {
  if (!trial) return false
  if (trial.status === 'expired') return true
  const expiresAtIso = computeEffectiveExpiresAt(trial)
  return new Date(expiresAtIso).getTime() <= Date.now()
}

// POST - เริ่มทดลองใช้
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทดลองใช้' }, { status: 401 })
    }

    const { tool_id } = await request.json()
    if (!tool_id) {
      return NextResponse.json({ error: 'ไม่ระบุ tool_id' }, { status: 400 })
    }

    // เช็คว่า tool เปิดใช้งานและเปิด trial มั้ย
    const { data: tool } = await supabase
      .from('tools')
      .select('id, name, is_active, is_coming_soon, trial_enabled, trial_flow_url')
      .eq('id', tool_id)
      .single()

    if (!tool || !tool.is_active || !tool.trial_enabled || tool.is_coming_soon) {
      return NextResponse.json({ error: 'เครื่องมือนี้ไม่เปิดให้ทดลองใช้ในขณะนี้' }, { status: 400 })
    }

    // เช็คว่าซื้อจริงแล้วหรือยัง (รวมถึงกรณีอยู่ในชุด Course Bundle)
    const bundleInfo = await getCourseBundleToolIds(supabaseAdmin)
    const checkToolIds = bundleInfo.bundleIds.includes(tool_id) ? bundleInfo.bundleIds : [tool_id]

    const { data: ownedRows } = await supabaseAdmin
      .from('user_tools')
      .select('id')
      .eq('user_id', user.id)
      .in('tool_id', checkToolIds)
      .eq('is_active', true)
      .limit(1)

    if (ownedRows && ownedRows.length > 0) {
      return NextResponse.json({ error: 'คุณมีสิทธิ์ใช้งานเต็มแล้ว', alreadyOwned: true }, { status: 400 })
    }

    // เช็คว่าเคย trial แล้วหรือยัง
    const { data: existing } = await supabaseAdmin
      .from('user_trials')
      .select('*')
      .eq('user_id', user.id)
      .eq('tool_id', tool_id)
      .maybeSingle()

    if (existing) {
      const expired = isTrialExpired(existing)
      if (expired && existing.status === 'active') {
        await supabaseAdmin
          .from('user_trials')
          .update({ status: 'expired' })
          .eq('id', existing.id)
        existing.status = 'expired'
      }
      return NextResponse.json({ 
        message: expired ? 'สิทธิ์ทดลองใช้งาน 7 วันของคุณหมดอายุแล้ว' : 'คุณเคยทดลองใช้แล้ว',
        trial: {
          ...existing,
          expires_at: computeEffectiveExpiresAt(existing),
        },
        alreadyTried: true,
        isExpired: expired,
      })
    }

    const nowIso = new Date().toISOString()
    const expiresAtIso = new Date(Date.now() + SEVEN_DAYS_MS).toISOString()

    // สร้าง trial record (7 วัน)
    let { data: trial, error } = await supabaseAdmin
      .from('user_trials')
      .insert({
        user_id: user.id,
        tool_id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        status: 'active',
        started_at: nowIso,
        expires_at: expiresAtIso,
      })
      .select()
      .single()

    if (error && (error.code === '42703' || error.message?.includes('expires_at'))) {
      const fallbackInsert = await supabaseAdmin
        .from('user_trials')
        .insert({
          user_id: user.id,
          tool_id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          status: 'active',
          started_at: nowIso,
        })
        .select()
        .single()
      trial = fallbackInsert.data ? { ...fallbackInsert.data, expires_at: expiresAtIso } : null
      error = fallbackInsert.error
    }

    if (error || !trial) {
      return NextResponse.json({ error: error?.message || 'ไม่สามารถเริ่มทดลองใช้ได้' }, { status: 500 })
    }

    // แจ้ง Telegram (พร้อมปุ่มให้สิทธิ์เต็ม)
    notifyTrialStarted(
      user.user_metadata?.full_name || user.email || '',
      user.email || '',
      tool.name,
      trial.id
    )

    return NextResponse.json({ 
      success: true, 
      message: 'เริ่มทดลองใช้สำเร็จ! (ใช้งานได้ 7 วัน)',
      trial: {
        ...trial,
        expires_at: computeEffectiveExpiresAt(trial),
      },
      trial_flow_url: tool.trial_flow_url
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET - เช็คสถานะ trial
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ hasTrialAccess: false })
    }

    const url = new URL(request.url)
    const toolId = url.searchParams.get('tool_id')

    if (!toolId) {
      // ดึง trial ทั้งหมดของ user
      const { data: trials } = await supabaseAdmin
        .from('user_trials')
        .select('*, tools(name, slug, trial_flow_url)')
        .eq('user_id', user.id)

      const enriched = await Promise.all(
        (trials || []).map(async (t: any) => {
          const expired = isTrialExpired(t)
          if (expired && t.status === 'active') {
            await supabaseAdmin.from('user_trials').update({ status: 'expired' }).eq('id', t.id)
            t.status = 'expired'
          }
          return {
            ...t,
            expires_at: computeEffectiveExpiresAt(t),
            isExpired: expired,
          }
        })
      )

      return NextResponse.json({ trials: enriched })
    }

    // เช็คเฉพาะ tool
    const { data: trial } = await supabaseAdmin
      .from('user_trials')
      .select('*, tools(name, slug, trial_flow_url)')
      .eq('user_id', user.id)
      .eq('tool_id', toolId)
      .maybeSingle()

    if (!trial) {
      return NextResponse.json({
        hasTrialAccess: false,
        trial: null,
      })
    }

    const expired = isTrialExpired(trial)
    if (expired && trial.status === 'active') {
      await supabaseAdmin.from('user_trials').update({ status: 'expired' }).eq('id', trial.id)
      trial.status = 'expired'
    }

    const activeTrialAccess = trial.status === 'active' && !expired

    return NextResponse.json({
      hasTrialAccess: activeTrialAccess,
      isExpired: expired,
      trial: {
        ...trial,
        expires_at: computeEffectiveExpiresAt(trial),
      },
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
