const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegram(message: string, replyMarkup?: any) {
  if (!BOT_TOKEN || !CHAT_ID) return

  try {
    const body: any = {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
    if (replyMarkup) {
      body.reply_markup = JSON.stringify(replyMarkup)
    }
    await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    console.error('Telegram send error:', err)
  }
}

export async function answerCallback(callbackQueryId: string, text: string) {
  try {
    await fetch(`${API_BASE}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: true })
    })
  } catch (err) {
    console.error('Answer callback error:', err)
  }
}

export async function editMessage(chatId: string, messageId: number, text: string) {
  try {
    await fetch(`${API_BASE}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML'
      })
    })
  } catch (err) {
    console.error('Edit message error:', err)
  }
}

// ========== Notification functions ==========

export function notifyNewOrder(customerName: string, customerEmail: string, toolName: string, price: string, orderId?: string) {
  const buttons = orderId ? {
    inline_keyboard: [[
      { text: '✅ อนุมัติ', callback_data: `approve_${orderId}` },
      { text: '❌ ปฏิเสธ', callback_data: `reject_${orderId}` }
    ]]
  } : undefined

  return sendTelegram(
    `🛒 <b>คำสั่งซื้อใหม่!</b>\n` +
    `👤 ${customerName}\n` +
    `📧 ${customerEmail}\n` +
    `🛠️ ${toolName}\n` +
    `💰 ${price}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
    buttons
  )
}

export function notifyOrderApproved(customerEmail: string, toolName: string) {
  return sendTelegram(
    `✅ <b>อนุมัติคำสั่งซื้อ</b>\n` +
    `📧 ${customerEmail}\n` +
    `🛠️ ${toolName}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}

export function notifyNewMember(name: string, email: string) {
  return sendTelegram(
    `👤 <b>สมาชิกใหม่ลงทะเบียน!</b>\n` +
    `🙋 ${name}\n` +
    `📧 ${email}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}

export function notifyLicenseActivated(email: string, toolName: string, keyCode: string) {
  return sendTelegram(
    `🔑 <b>ใช้ License Key!</b>\n` +
    `📧 ${email}\n` +
    `🛠️ ${toolName}\n` +
    `🔐 ${keyCode}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}

export function notifyTrialStarted(name: string, email: string, toolName: string, trialId?: string) {
  const buttons = trialId ? {
    inline_keyboard: [
      [
        { text: '✅ ให้สิทธิ์เต็ม (ปิดการขาย)', callback_data: `convert_${trialId}` }
      ],
      [
        { text: '📧 ส่งดีลพิเศษเข้าอีเมล', callback_data: `deal_${trialId}` }
      ],
      [
        { text: '💬 เมล์หาลูกค้าโดยตรง', url: `mailto:${email}?subject=${encodeURIComponent(`ข้อเสนอพิเศษปลดล็อก ${toolName} - PUP PAP AI`)}` }
      ]
    ]
  } : undefined

  return sendTelegram(
    `🎁 <b>เริ่มทดลองใช้ใหม่!</b>\n` +
    `👤 <b>${name || 'ไม่ระบุชื่อ'}</b>\n` +
    `📧 ${email}\n` +
    `🛠️ ${toolName}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
    buttons
  )
}

export function notifyTrialAutoFollowUp(name: string, email: string, toolName: string, trialId: string, hoursElapsed: number) {
  const buttons = {
    inline_keyboard: [
      [
        { text: '✅ ให้สิทธิ์เต็ม (ปิดการขาย)', callback_data: `convert_${trialId}` }
      ],
      [
        { text: '📧 ส่งอีเมลดีลพิเศษซ้ำ', callback_data: `deal_${trialId}` }
      ],
      [
        { text: '💬 เมล์หาลูกค้า', url: `mailto:${email}?subject=${encodeURIComponent(`ข้อเสนอพิเศษปลดล็อก ${toolName} - PUP PAP AI`)}` }
      ]
    ]
  }

  const days = Math.floor(hoursElapsed / 24)
  const hours = Math.floor(hoursElapsed % 24)
  const timeStr = days > 0 ? `${days} วัน ${hours > 0 ? `${hours} ชม.` : ''}` : `${hours} ชม.`

  return sendTelegram(
    `⏰ <b>ครบ ${timeStr}! ติดตามปิดการขายอัตโนมัติ</b>\n` +
    `👤 <b>${name || 'ไม่ระบุชื่อ'}</b>\n` +
    `📧 ${email}\n` +
    `🛠️ ${toolName}\n` +
    `📨 <i>สถานะ: ระบบส่งอีเมลข้อเสนอพิเศษให้ลูกค้าเรียบร้อยแล้ว</i>\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
    buttons
  )
}

export function notifyTrialConverted(name: string, email: string, toolName: string) {
  return sendTelegram(
    `💰 <b>Trial → ซื้อจริง! (ปิดการขายสำเร็จ)</b>\n` +
    `🙋 ${name}\n` +
    `📧 ${email}\n` +
    `🛠️ ${toolName}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}

