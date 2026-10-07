import { supabase } from '@/lib/supabase'
import { sendEmail, buildTrialFollowUpEmail } from '@/lib/email'
import { notifyTrialAutoFollowUp } from '@/lib/telegram'

export interface FollowUpResult {
  success: boolean
  processedCount: number
  totalEligible: number
  details: Array<{
    email: string
    name: string
    toolName: string
    status: 'sent' | 'failed'
    error?: string
  }>
}

/**
 * Checks all active trials that have been running for >= 24 hours
 * and sends an automated sales follow-up email to the customer,
 * and notifies the admin via Telegram.
 */
export async function processTrialFollowUps(): Promise<FollowUpResult> {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // 1. Fetch active trials started >= 24 hours ago
  const { data: trials, error } = await supabase
    .from('user_trials')
    .select('*, tools(name, price, slug)')
    .eq('status', 'active')
    .lte('started_at', oneDayAgo)

  if (error || !trials) {
    console.error('Error fetching trials for follow up:', error)
    return {
      success: false,
      processedCount: 0,
      totalEligible: 0,
      details: []
    }
  }

  // 2. Filter out trials that already received a follow-up
  const eligible = trials.filter((t: any) => !t.followup_sent_at)
  const results: FollowUpResult['details'] = []
  let processedCount = 0

  for (const trial of eligible) {
    const toolName = trial.tools?.name || 'เครื่องมือ AI'
    const toolSlug = trial.tools?.slug
    const toolPrice = trial.tools?.price

    const html = buildTrialFollowUpEmail({
      customerName: trial.user_name,
      toolName,
      toolSlug,
      toolPrice
    })

    const emailRes = await sendEmail({
      to: trial.user_email,
      subject: `🎁 คุณ ${trial.user_name || ''}! ข้อเสนอพิเศษปลดล็อก ${toolName} เวอร์ชันเต็ม (ตลอดชีพ) - PUP PAP AI`,
      html
    })

    if (emailRes.success) {
      processedCount++
      results.push({
        email: trial.user_email,
        name: trial.user_name,
        toolName,
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
      const startTime = new Date(trial.started_at || trial.created_at).getTime()
      const diffHours = Math.max(24, Math.floor((now.getTime() - startTime) / (1000 * 60 * 60)))
      await notifyTrialAutoFollowUp(trial.user_name, trial.user_email, toolName, trial.id, diffHours)
    } else {
      results.push({
        email: trial.user_email,
        name: trial.user_name,
        toolName,
        status: 'failed',
        error: emailRes.error
      })
    }
  }

  return {
    success: true,
    processedCount,
    totalEligible: eligible.length,
    details: results
  }
}
