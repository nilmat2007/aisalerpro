const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegram(message: string, replyMarkup?: any): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || CHAT_ID
  if (!botToken || !chatId) return false

  try {
    const body: any = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
    if (replyMarkup) {
      body.reply_markup = JSON.stringify(replyMarkup)
    }
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return res.ok
  } catch (err) {
    console.error('Telegram send error:', err)
    return false
  }
}

export async function sendTelegramPhoto(photoUrl: string, caption: string, replyMarkup?: any) {
  if (!BOT_TOKEN || !CHAT_ID) return

  try {
    const body: any = {
      chat_id: CHAT_ID,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
    }
    if (replyMarkup) {
      body.reply_markup = JSON.stringify(replyMarkup)
    }
    const res = await fetch(`${API_BASE}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      // Fallback to text message with link if Telegram failed to fetch photo URL
      await sendTelegram(`${caption}\n\n🧾 <a href="${photoUrl}">กดดูรูปสลิปโอนเงิน</a>`, replyMarkup)
    }
  } catch (err) {
    console.error('Telegram sendPhoto error:', err)
    await sendTelegram(`${caption}\n\n🧾 <a href="${photoUrl}">กดดูรูปสลิปโอนเงิน</a>`, replyMarkup)
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

export async function editMessage(chatId: string, messageId: number, text: string, isPhotoMessage = false) {
  try {
    if (isPhotoMessage) {
      const res = await fetch(`${API_BASE}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: text,
          parse_mode: 'HTML',
        }),
      })
      if (res.ok) return
    }
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

export function notifyNewOrder(
  customerName: string,
  customerEmail: string,
  toolName: string,
  price: string,
  orderId?: string,
  slipUrl?: string
) {
  const inlineRows: any[] = []
  if (orderId) {
    inlineRows.push([
      { text: '✅ อนุมัติทันที', callback_data: `approve_${orderId}` },
      { text: '❌ ปฏิเสธ', callback_data: `reject_${orderId}` }
    ])
  }
  if (slipUrl && slipUrl.startsWith('http')) {
    inlineRows.push([
      { text: '🔍 เปิดดูรูปสลิปขนาดเต็ม', url: slipUrl }
    ])
  }
  const buttons = inlineRows.length > 0 ? { inline_keyboard: inlineRows } : undefined

  const caption =
    `🛒 <b>คำสั่งซื้อใหม่! (รอตรวจสลิป)</b>\n` +
    `👤 ${customerName}\n` +
    `📧 ${customerEmail}\n` +
    `🛠️ ${toolName}\n` +
    `💰 <b>${price}</b>\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`

  if (slipUrl && slipUrl.startsWith('http')) {
    return sendTelegramPhoto(slipUrl, caption, buttons)
  }

  return sendTelegram(caption, buttons)
}

export function notifyOrderApproved(customerEmail: string, toolName: string) {
  return sendTelegram(
    `✅ <b>อนุมัติคำสั่งซื้อ</b>\n` +
    `📧 ${customerEmail}\n` +
    `🛠️ ${toolName}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}

export function notifyAiAutoApprovedOrder(
  customerName: string,
  customerEmail: string,
  toolName: string,
  price: string,
  slipUrl: string,
  aiNote: string
) {
  const buttons =
    slipUrl && slipUrl.startsWith('http')
      ? {
          inline_keyboard: [[{ text: '🔍 เปิดดูรูปสลิปขนาดเต็ม', url: slipUrl }]],
        }
      : undefined

  const caption =
    `🤖✅ <b>AI ตรวจสลิปผ่าน & อนุมัติอัตโนมัติแล้ว!</b>\n` +
    `👤 ${customerName}\n` +
    `📧 ${customerEmail}\n` +
    `🛠️ ${toolName}\n` +
    `💰 <b>${price}</b>\n` +
    `🛡️ <i>${aiNote}</i>\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`

  if (slipUrl && slipUrl.startsWith('http')) {
    return sendTelegramPhoto(slipUrl, caption, buttons)
  }
  return sendTelegram(caption, buttons)
}

export function notifyAiAutoRejectedOrder(
  customerName: string,
  customerEmail: string,
  toolName: string,
  price: string,
  orderId: string,
  slipUrl: string,
  rejectReason: string
) {
  const inlineRows: any[] = [
    [{ text: '✅ อนุมัติแทน AI (Override)', callback_data: `approve_${orderId}` }],
  ]
  if (slipUrl && slipUrl.startsWith('http')) {
    inlineRows.push([{ text: '🔍 เปิดดูรูปสลิปขนาดเต็ม', url: slipUrl }])
  }
  const buttons = { inline_keyboard: inlineRows }

  const caption =
    `🤖❌ <b>AI ปฏิเสธสลิปอัตโนมัติ (ให้ลูกค้าแนบใหม่แล้ว)</b>\n` +
    `👤 ${customerName}\n` +
    `📧 ${customerEmail}\n` +
    `🛠️ ${toolName}\n` +
    `💰 <b>${price}</b>\n` +
    `⚠️ <b>สาเหตุ:</b> ${rejectReason}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`

  if (slipUrl && slipUrl.startsWith('http')) {
    return sendTelegramPhoto(slipUrl, caption, buttons)
  }
  return sendTelegram(caption, buttons)
}

export function notifyNewMember(name: string, email: string): Promise<boolean> {
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

export async function notifyBundleGrantFailure(params: {
  userId?: string | null
  userEmail?: string | null
  orderId?: string | null
  errorCode: string
  errorMessage?: string
  requestId?: string
  context?: string
}): Promise<boolean> {
  const buttons = params.orderId
    ? {
        inline_keyboard: [
          [{ text: '🔄 กดอนุมัติซ้ำ (Retry Grant)', callback_data: `approve_${params.orderId}` }],
        ],
      }
    : undefined

  const text =
    `🚨 <b>[BUNDLE GRANT / SYNC ALERT]</b>\n` +
    `⚠️ <b>รหัสข้อผิดพลาด:</b> <code>${params.errorCode}</code>\n` +
    (params.context ? `📍 <b>จุดเกิดเหตุ:</b> ${params.context}\n` : '') +
    (params.orderId ? `🧾 <b>Order ID:</b> <code>${params.orderId}</code>\n` : '') +
    (params.userEmail ? `📧 <b>อีเมลลูกค้า:</b> ${params.userEmail}\n` : '') +
    (params.userId ? `🆔 <b>User ID:</b> <code>${params.userId}</code>\n` : '') +
    (params.requestId ? `🔗 <b>Request ID:</b> <code>${params.requestId}</code>\n` : '') +
    (params.errorMessage ? `📝 <b>รายละเอียด:</b> ${params.errorMessage}\n` : '') +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`

  const sentTelegram = await sendTelegram(text, buttons)

  // Fallback to ADMIN_ALERT_EMAIL / SMTP_USER if Telegram fails or if critical
  const fallbackAdminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || ''
  if ((!sentTelegram || params.errorCode.includes('CRITICAL') || params.errorCode.includes('EXHAUSTED')) && fallbackAdminEmail) {
    try {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail({
        to: fallbackAdminEmail,
        subject: `🚨 [ALERT: ${params.errorCode}] ระบบปลดล็อกชุดโปรโมชันคอร์ส ฿299 ต้องการการตรวจสอบ`,
        html: `<div style="font-family:sans-serif;line-height:1.6">
          <h2 style="color:#dc2626">🚨 แจ้งเตือนระบบ Course Bundle (${params.errorCode})</h2>
          <p><b>Context:</b> ${params.context || '-'}</p>
          <p><b>Order ID:</b> ${params.orderId || '-'}</p>
          <p><b>User Email:</b> ${params.userEmail || '-'}</p>
          <p><b>User ID:</b> ${params.userId || '-'}</p>
          <p><b>Request ID:</b> ${params.requestId || '-'}</p>
          <p><b>Detail:</b> ${params.errorMessage || '-'}</p>
        </div>`,
      })
    } catch (emailErr) {
      console.error('[notifyBundleGrantFailure] Fallback email failed:', emailErr)
    }
  }

  const webhookUrl = process.env.CRITICAL_ALERT_WEBHOOK_URL
  if (webhookUrl && (params.errorCode.includes('CRITICAL') || params.errorCode.includes('EXHAUSTED'))) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, timestamp: new Date().toISOString() }),
    }).catch((err) => console.error('[notifyBundleGrantFailure] Webhook error:', err))
  }

  return sentTelegram
}


