import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getFBUserProfile, sendFBMessage, sendFBMessageWithButtons, sendNotificationOptIn } from '@/lib/facebook'
import { sendTelegram } from '@/lib/telegram'

const VERIFY_TOKEN = 'pheem_ai_toolkit_fb_verify_2026'

// ========== GET: Webhook Verification ==========
export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('FB Webhook verified!')
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ========== POST: Incoming Messages & Events ==========
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' })
    }

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderPsid = event.sender?.id
        if (!senderPsid) continue

        // Skip messages from the page itself
        if (senderPsid === process.env.FB_PAGE_ID) continue

        // Save/update contact in database
        await saveContact(senderPsid)

        // Handle Opt-in event (Recurring Notifications Token)
        if (event.optin) {
          await handleOptin(senderPsid, event.optin)
        }

        // Handle text message
        if (event.message?.text) {
          await handleIncomingMessage(senderPsid, event.message.text)
        }

        // Handle postback (button click)
        if (event.postback?.payload) {
          await handlePostback(senderPsid, event.postback.payload)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('FB Webhook error:', err)
    return NextResponse.json({ status: 'error' })
  }
}

// ========== Save Contact ==========
async function saveContact(psid: string) {
  try {
    // Check if contact exists
    const { data: existing } = await supabase
      .from('fb_contacts')
      .select('id')
      .eq('psid', psid)
      .maybeSingle()

    if (existing) {
      // Update last message time
      await supabase
        .from('fb_contacts')
        .update({ last_message_at: new Date().toISOString() })
        .eq('psid', psid)
    } else {
      // Get profile info
      const profile = await getFBUserProfile(psid)

      await supabase.from('fb_contacts').insert({
        psid,
        name: profile?.name || null,
        profile_pic: profile?.profilePic || null,
        first_message_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })

      // Notify admin via Telegram
      await sendTelegram(
        `💬 <b>ลูกค้าใหม่ทัก Facebook!</b>\n` +
        `👤 <b>${profile?.name || 'ไม่ทราบชื่อ'}</b>\n` +
        `🆔 PSID: <code>${psid}</code>\n` +
        `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
      )
    }
  } catch (err) {
    console.error('Save contact error:', err)
  }
}

// ========== Handle Opt-in Event ==========
async function handleOptin(psid: string, optin: any) {
  try {
    const token = optin.notification_messages_token || optin.one_time_notif_token
    if (!token) return

    // Save token to fb_optins table
    await supabase.from('fb_optins').upsert({
      psid,
      token,
      title: optin.title || 'โปรโมชั่นและอัปเดตเครื่องมือ AI',
      frequency: optin.notification_messages_frequency || 'WEEKLY',
      status: optin.notification_messages_status || 'ACTIVE',
      expires_at: optin.token_expiry_timestamp ? new Date(optin.token_expiry_timestamp).toISOString() : null,
      created_at: new Date().toISOString()
    })

    const profile = await getFBUserProfile(psid)
    await sendTelegram(
      `🎟️ <b>ลูกค้ายินยอมรับข่าวสาร (Opt-in)!</b>\n` +
      `👤 <b>${profile?.name || 'ลูกค้า Facebook'}</b>\n` +
      `🔑 มีสิทธิ์ส่งข่าวนอกรอบ 24 ชม. ได้แล้ว\n` +
      `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
    )

    // Send thank you message
    await sendFBMessage(psid, 'ขอบคุณที่กดรับข่าวสารครับ! เมื่อมีโปรโมชั่นและอัปเดตใหม่ๆ เราจะแจ้งให้ทราบก่อนใคร 🎉')
  } catch (err) {
    console.error('Save optin error:', err)
  }
}

// Helper: Get LINE OA URL from site settings
async function getLineOaUrl(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('line_oa_url')
      .limit(1)
      .single()
    return data?.line_oa_url || null
  } catch {
    return null
  }
}

// ========== Handle Incoming Message ==========
async function handleIncomingMessage(psid: string, text: string) {
  const lower = text.toLowerCase().trim()
  const lineUrl = await getLineOaUrl()

  // Auto-reply keywords: สนใจ / ราคา
  if (lower === 'สนใจ' || lower === 'ราคา' || lower === 'price') {
    const { data: tools } = await supabase
      .from('tools')
      .select('name, slug, price')
      .eq('is_active', true)
      .order('sort_order')

    let msg = '🎉 ขอบคุณที่สนใจครับ!\n\nเครื่องมือ AI ที่มีให้บริการ:\n\n'
    tools?.forEach(t => {
      msg += `🛠️ ${t.name}\n💰 ราคา: ฿${t.price || 'ฟรี'} (ซื้อขาดตลอดชีพ)\n\n`
    })
    msg += '👉 ดูรายละเอียดเพิ่มเติมกดปุ่มด้านล่างได้เลยครับ!'

    const buttons: Array<{ title: string; url?: string; payload?: string }> = [
      { title: '🛒 สั่งซื้อบนเว็บ', url: 'https://puppapai.vercel.app/store' },
      { title: '🎁 ทดลองใช้ฟรี', url: 'https://puppapai.vercel.app' }
    ]

    if (lineUrl) {
      buttons.push({ title: '📲 คุยต่อทาง LINE', url: lineUrl })
    }

    await sendFBMessageWithButtons(psid, msg, buttons.slice(0, 3))
    
    // Also send Opt-In card so we can message them later
    await sendNotificationOptIn(psid)
    return
  }

  // Auto-reply keywords: ทดลอง / trial
  if (lower === 'ทดลอง' || lower === 'ทดลองใช้' || lower === 'trial' || lower === 'demo') {
    const buttons: Array<{ title: string; url?: string; payload?: string }> = [
      { title: '🚀 เริ่มทดลองใช้ฟรี', url: 'https://puppapai.vercel.app' }
    ]
    if (lineUrl) {
      buttons.push({ title: '📲 แอด LINE รับสิทธิ์', url: lineUrl })
    }

    await sendFBMessageWithButtons(psid,
      '🎁 ทดลองใช้ฟรี!\n\nคุณสามารถทดลองใช้เครื่องมือสร้างคลิปวิดีโอ AI ได้ฟรี 3 คลิป!\n\nกดปุ่มด้านล่างเพื่อเริ่มเลยครับ 👇',
      buttons
    )
    return
  }

  // Auto-reply keywords: สมัคร / register
  if (lower === 'สมัคร' || lower === 'ลงทะเบียน' || lower === 'register') {
    const buttons: Array<{ title: string; url?: string; payload?: string }> = [
      { title: '🔑 ล็อกอินด้วย Google', url: 'https://puppapai.vercel.app/login' }
    ]
    if (lineUrl) {
      buttons.push({ title: '📲 ติดต่อแอดมิน LINE', url: lineUrl })
    }

    await sendFBMessageWithButtons(psid,
      '👤 สมัครสมาชิก\n\nสมัครง่ายๆ แค่ล็อกอินด้วย Google เท่านั้น!\n\nกดปุ่มด้านล่างเลยครับ 👇',
      buttons
    )
    return
  }

  // Notify admin for unhandled messages
  const profile = await getFBUserProfile(psid)
  await sendTelegram(
    `💬 <b>ข้อความจาก Facebook</b>\n` +
    `👤 ${profile?.name || psid}\n` +
    `💭 ${text}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}

// ========== Handle Postback ==========
async function handlePostback(psid: string, payload: string) {
  const lineUrl = await getLineOaUrl()

  if (payload === 'GET_STARTED') {
    const buttons: Array<{ title: string; url?: string; payload?: string }> = [
      { title: '🛒 ดูเครื่องมือทั้งหมด', url: 'https://puppapai.vercel.app/store' },
      { title: '🎁 ทดลองใช้ฟรี', url: 'https://puppapai.vercel.app' }
    ]
    if (lineUrl) {
      buttons.push({ title: '📲 แอด LINE รับส่วนลด', url: lineUrl })
    }

    await sendFBMessageWithButtons(psid,
      '🤖 สวัสดีครับ! ยินดีต้อนรับสู่ PHEEM AI TOOLKIT\n\n' +
      'ศูนย์รวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอระดับมืออาชีพ ✨\n\n' +
      'พิมพ์คำว่า "สนใจ" เพื่อดูรายการเครื่องมือ หรือกดปุ่มด้านล่างได้เลยครับ!',
      buttons.slice(0, 3)
    )

    // Invite to opt-in for future discounts
    setTimeout(() => {
      sendNotificationOptIn(psid).catch(() => {})
    }, 1500)
  }
}
