import { supabase } from '@/lib/supabase'
import { sendEmail, buildTrialFollowUpEmail } from '@/lib/email'
import { notifyTrialAutoFollowUp } from '@/lib/telegram'

export interface FollowUpResult {
  success: boolean
  processedCount: number
  expiredCount?: number
  totalEligible: number
  details: Array<{
    email: string
    name: string
    toolName: string
    stage?: 'day1_checkin' | 'day6_expiry_warning'
    status: 'sent' | 'failed'
    error?: string
  }>
}

/**
 * 1) Marks expired trials (`expires_at <= now()`) as `'expired'`.
 * 2) Day-1 Check-in (`started_at <= now - 24h` and `!followup_sent_at`): sends 24h sales follow-up email.
 * 3) Day-6 Expiry Reminder (`expires_at <= now + 24h` and `expires_at > now`): sends final 24h warning before 7-day trial expires.
 */
export async function processTrialFollowUps(): Promise<FollowUpResult> {
  const now = new Date()
  const nowMs = now.getTime()
  const oneDayAgoIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  // 1. Fetch active trials
  const { data: trials, error } = await supabase
    .from('user_trials')
    .select('*, tools(name, price, slug)')
    .eq('status', 'active')

  if (error || !trials) {
    console.error('Error fetching trials for follow up:', error)
    return {
      success: false,
      processedCount: 0,
      expiredCount: 0,
      totalEligible: 0,
      details: []
    }
  }

  let expiredCount = 0
  const activeTrials: any[] = []

  for (const t of trials) {
    const startMs = new Date(t.started_at || t.created_at || now.toISOString()).getTime()
    const effectiveExpiresMs = t.expires_at ? new Date(t.expires_at).getTime() : startMs + sevenDaysMs

    if (effectiveExpiresMs <= nowMs) {
      expiredCount++
      await supabase.from('user_trials').update({ status: 'expired' }).eq('id', t.id)
    } else {
      activeTrials.push({
        ...t,
        _startMs: startMs,
        _expiresMs: effectiveExpiresMs,
      })
    }
  }

  // 2. Filter trials eligible for Day-1 (24h check-in) or Day-6 (24h before 7-day expiry)
  const eligible = activeTrials.filter((t: any) => {
    const isDay1Eligible = t._startMs <= new Date(oneDayAgoIso).getTime() && !t.followup_sent_at
    const isDay6Window = t._expiresMs - nowMs <= 24 * 60 * 60 * 1000 && t._expiresMs > nowMs
    const lastSentMs = t.followup_sent_at ? new Date(t.followup_sent_at).getTime() : 0
    const isDay6Eligible = isDay6Window && (nowMs - lastSentMs >= 48 * 60 * 60 * 1000)
    return isDay1Eligible || isDay6Eligible
  })

  const results: FollowUpResult['details'] = []
  let processedCount = 0

  for (const trial of eligible) {
    const toolName = trial.tools?.name || 'เครื่องมือ AI'
    const toolSlug = trial.tools?.slug
    const toolPrice = trial.tools?.price
    const isDay6Warning = trial._expiresMs - nowMs <= 24 * 60 * 60 * 1000
    const stage: 'day1_checkin' | 'day6_expiry_warning' = isDay6Warning ? 'day6_expiry_warning' : 'day1_checkin'

    const html = buildTrialFollowUpEmail({
      customerName: trial.user_name,
      toolName,
      toolSlug,
      toolPrice
    })

    const subject = isDay6Warning
      ? `⏳ เหลือเวลาทดลองใช้ ${toolName} อีกไม่ถึง 24 ชม.! ปลดล็อกเวอร์ชันเต็มตลอดชีพ ฿299 - PUP PAP AI`
      : `🎁 คุณ ${trial.user_name || ''}! ข้อเสนอพิเศษปลดล็อก ${toolName} เวอร์ชันเต็ม (ตลอดชีพ) - PUP PAP AI`

    const emailRes = await sendEmail({
      to: trial.user_email,
      subject,
      html
    })

    if (emailRes.success) {
      processedCount++
      results.push({
        email: trial.user_email,
        name: trial.user_name,
        toolName,
        stage,
        status: 'sent'
      })

      // Update followup_sent_at in database
      try {
        await supabase
          .from('user_trials')
          .update({ followup_sent_at: new Date().toISOString() })
          .eq('id', trial.id)
      } catch (updateErr) {
        console.warn('Could not update followup_sent_at (column may need to be created):', updateErr)
      }

      // Notify admin on Telegram
      const diffHours = Math.max(24, Math.floor((nowMs - trial._startMs) / (1000 * 60 * 60)))
      await notifyTrialAutoFollowUp(trial.user_name, trial.user_email, toolName, trial.id, diffHours)
    } else {
      results.push({
        email: trial.user_email,
        name: trial.user_name,
        toolName,
        stage,
        status: 'failed',
        error: emailRes.error
      })
    }
  }

  return {
    success: true,
    processedCount,
    expiredCount,
    totalEligible: eligible.length,
    details: results
  }
}
