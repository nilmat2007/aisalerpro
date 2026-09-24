const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

export async function sendTelegram(message: string) {
  if (!BOT_TOKEN || !CHAT_ID) return
  
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    })
  } catch (err) {
    console.error('Telegram send error:', err)
  }
}

// Helper functions for each activity type
export function notifyNewOrder(customerName: string, customerEmail: string, toolName: string, price: string) {
  return sendTelegram(
    `🛒 <b>คำสั่งซื้อใหม่!</b>\n` +
    `👤 ${customerName}\n` +
    `📧 ${customerEmail}\n` +
    `🛠️ ${toolName}\n` +
    `💰 ${price}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
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

export function notifyTrialStarted(name: string, email: string, toolName: string) {
  return sendTelegram(
    `🎁 <b>เริ่มทดลองใช้!</b>\n` +
    `🙋 ${name}\n` +
    `📧 ${email}\n` +
    `🛠️ ${toolName}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}

export function notifyTrialConverted(name: string, email: string, toolName: string) {
  return sendTelegram(
    `💰 <b>Trial → ซื้อจริง!</b>\n` +
    `🙋 ${name}\n` +
    `📧 ${email}\n` +
    `🛠️ ${toolName}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
}
