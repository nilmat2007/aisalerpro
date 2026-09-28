import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendTelegram, answerCallback, editMessage } from '@/lib/telegram'
import { sendEmail, buildTrialFollowUpEmail } from '@/lib/email'
import { processTrialFollowUps } from '@/lib/trial-followup'
import { broadcastFBMessage } from '@/lib/facebook'

export async function POST(request: Request) {
  try {
    const update = await request.json()

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      return handleCallback(update.callback_query)
    }

    // Handle text commands
    if (update.message?.text) {
      const chatId = String(update.message.chat.id)
      const adminChatId = process.env.TELEGRAM_CHAT_ID || ''

      // Only respond to admin
      if (chatId !== adminChatId) {
        return NextResponse.json({ ok: true })
      }

      const text = update.message.text.trim()
      const command = text.split(' ')[0].split('@')[0].toLowerCase()

      switch (command) {
        case '/start':
          return handleStart()
        case '/stats':
          return handleStats()
        case '/pending':
          return handlePending()
        case '/trials':
        case '/trial':
          return handleTrials()
        case '/followup':
          return handleFollowUp()
        case '/genkey':
          return handleGenKey(text)
        case '/broadcast':
          return handleBroadcast(text)
        case '/contacts':
          return handleContacts()
        case '/help':
          return handleStart()
        default:
          return NextResponse.json({ ok: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}

// ========== /start ==========
async function handleStart() {
  await sendTelegram(
    `🤖 <b>AI SALER PRO Bot (ระบบจัดการและปิดการขาย)</b>\n\n` +
    `คำสั่งที่ใช้ได้:\n\n` +
    `📊 /stats — ดูสรุปยอดขายและสถิติภาพรวม\n` +
    `📋 /pending — ดูออเดอร์รออนุมัติ + ปุ่มอนุมัติ\n` +
    `🎁 /trials — ดูคนกำลังทดลองใช้ + ปุ่มส่งดีลปิดการขาย\n` +
    `⏰ /followup — ส่งดีลปิดการขายให้คนทดลองครบ 24 ชม.\n` +
    `🔑 /genkey [slug] — สร้าง License Key ทันที\n` +
    `📢 /broadcast [ข้อความ] — บรอดแคสต์ Facebook\n` +
    `👥 /contacts — ดูรายชื่อลูกค้า Facebook\n` +
    `❓ /help — แสดงคำสั่งทั้งหมด\n\n` +
    `ตัวอย่าง:\n` +
    `<code>/genkey ugc-batch</code>\n` +
    `<code>/broadcast 🔥 โปรพิเศษวันนี้!</code>`
  )
  return NextResponse.json({ ok: true })
}

// ========== /stats ==========
async function handleStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Total revenue
  const { data: allKeys } = await supabase
    .from('license_keys')
    .select('tools(price)')
    .eq('status', 'activated')

  let totalRevenue = 0
  let monthRevenue = 0
  let todayRevenue = 0

  const { data: monthKeys } = await supabase
    .from('license_keys')
    .select('activated_at, tools(price)')
    .eq('status', 'activated')
    .gte('activated_at', startOfMonth)

  const { data: todayKeys } = await supabase
    .from('license_keys')
    .select('activated_at, tools(price)')
    .eq('status', 'activated')
    .gte('activated_at', startOfToday)

  allKeys?.forEach((k: any) => {
    const price = parseFloat(String(k.tools?.price || '0').replace(/[^0-9.]/g, '')) || 0
    totalRevenue += price
  })

  monthKeys?.forEach((k: any) => {
    const price = parseFloat(String(k.tools?.price || '0').replace(/[^0-9.]/g, '')) || 0
    monthRevenue += price
  })

  todayKeys?.forEach((k: any) => {
    const price = parseFloat(String(k.tools?.price || '0').replace(/[^0-9.]/g, '')) || 0
    todayRevenue += price
  })

  // Counts
  const { count: totalMembers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: pendingOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  const { count: activeTrials } = await supabase.from('user_trials').select('*', { count: 'exact', head: true }).eq('status', 'active')

  await sendTelegram(
    `📊 <b>สรุปยอดขาย AI SALER PRO</b>\n\n` +
    `💰 รายได้รวม: <b>฿${totalRevenue.toLocaleString()}</b>\n` +
    `📅 เดือนนี้: <b>฿${monthRevenue.toLocaleString()}</b>\n` +
    `📆 วันนี้: <b>฿${todayRevenue.toLocaleString()}</b>\n\n` +
    `👥 สมาชิกทั้งหมด: <b>${totalMembers || 0}</b>\n` +
    `📋 ออเดอร์รออนุมัติ: <b>${pendingOrders || 0}</b>\n` +
    `🎁 กำลังทดลองใช้: <b>${activeTrials || 0}</b>\n\n` +
    `⏰ ${now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
  return NextResponse.json({ ok: true })
}

// ========== /pending ==========
async function handlePending() {
  const { data: orders } = await supabase
    .from('orders')
    .select('*, tools(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!orders || orders.length === 0) {
    await sendTelegram('📋 <b>ไม่มีออเดอร์รออนุมัติ</b> ✅')
    return NextResponse.json({ ok: true })
  }

  let msg = `📋 <b>ออเดอร์รออนุมัติ (${orders.length} รายการ)</b>\n\n`

  for (const order of orders) {
    const date = new Date(order.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    msg += `━━━━━━━━━━━━━━━\n`
    msg += `📧 ${order.user_email}\n`
    msg += `🛠️ ${(order as any).tools?.name || 'ไม่ระบุ'}\n`
    msg += `💰 ฿${order.amount}\n`
    msg += `📅 ${date}\n`
  }

  // Send with approve buttons for each order
  const buttons = orders.map(order => ([
    { text: `✅ อนุมัติ ${(order as any).tools?.name || ''}`.substring(0, 30), callback_data: `approve_${order.id}` },
    { text: `❌ ปฏิเสธ`, callback_data: `reject_${order.id}` }
  ]))

  await sendTelegram(msg, { inline_keyboard: buttons })
  return NextResponse.json({ ok: true })
}

// ========== /genkey [slug] ==========
async function handleGenKey(text: string) {
  const parts = text.split(/\s+/)
  if (parts.length < 2) {
    // List available tools
    const { data: tools } = await supabase.from('tools').select('name, slug, price').eq('is_active', true).order('sort_order')
    let msg = `🔑 <b>สร้าง License Key</b>\n\nวิธีใช้: <code>/genkey [slug]</code>\n\n`
    msg += `เครื่องมือที่มี:\n`
    tools?.forEach(t => {
      msg += `• <code>/genkey ${t.slug}</code> — ${t.name} (฿${t.price || 'ฟรี'})\n`
    })
    await sendTelegram(msg)
    return NextResponse.json({ ok: true })
  }

  const slug = parts[1].toLowerCase()

  const { data: tool } = await supabase
    .from('tools')
    .select('id, name, price')
    .eq('slug', slug)
    .single()

  if (!tool) {
    await sendTelegram(`❌ ไม่พบเครื่องมือ "${slug}"\nพิมพ์ /genkey เพื่อดูรายการ`)
    return NextResponse.json({ ok: true })
  }

  // Generate key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let part1 = '', part2 = ''
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length))
    part2 += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const keyCode = `PHM-${part1}-${part2}`

  const { error } = await supabase.from('license_keys').insert({
    key_code: keyCode,
    tool_id: tool.id,
    package_type: 'single',
    status: 'unused',
    note: 'สร้างจาก Telegram Bot'
  })

  if (error) {
    await sendTelegram(`❌ สร้าง Key ไม่สำเร็จ: ${error.message}`)
    return NextResponse.json({ ok: true })
  }

  await sendTelegram(
    `🔑 <b>สร้าง License Key สำเร็จ!</b>\n\n` +
    `🛠️ ${tool.name}\n` +
    `💰 ฿${tool.price || 'ฟรี'}\n` +
    `🔐 Key: <code>${keyCode}</code>\n\n` +
    `📋 คัดลอกส่งให้ลูกค้าได้เลย!`
  )
  return NextResponse.json({ ok: true })
}

// ========== /trials ==========
async function handleTrials() {
  const { data: trials, error } = await supabase
    .from('user_trials')
    .select('*, tools(name, price, slug)')
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(10)

  if (error || !trials || trials.length === 0) {
    await sendTelegram('🎁 <b>ไม่มีผู้ใช้ที่กำลังทดลองใช้ในขณะนี้</b>')
    return NextResponse.json({ ok: true })
  }

  let msg = `🎁 <b>ผู้กำลังทดลองใช้ (${trials.length} คนล่าสุด)</b>\n\n`
  const buttons: any[] = []
  const now = Date.now()

  trials.forEach((t: any, index: number) => {
    const startTime = new Date(t.started_at || t.created_at).getTime()
    const diffHours = Math.max(0, Math.floor((now - startTime) / (1000 * 60 * 60)))
    const diffDays = Math.floor(diffHours / 24)
    const remainHours = diffHours % 24
    const timeElapsed = diffDays > 0 ? `${diffDays} วัน ${remainHours} ชม.` : `${remainHours} ชม.`

    const isOver24h = diffHours >= 24
    const badge = isOver24h ? ' 🔥 <b>[ครบ 1 วัน - ควรปิดการขาย!]</b>' : ''

    msg += `━━━━━━━━━━━━━━━\n`
    msg += `<b>${index + 1}. ${t.user_name || 'ไม่ระบุชื่อ'}</b>${badge}\n`
    msg += `📧 ${t.user_email}\n`
    msg += `🛠️ ${t.tools?.name || 'เครื่องมือ'} (฿${t.tools?.price || '0'})\n`
    msg += `⏳ ทดลองแล้ว: <b>${timeElapsed}</b>\n\n`

    const shortName = (t.user_name || t.user_email.split('@')[0]).substring(0, 15)
    buttons.push([
      { text: `✅ ให้สิทธิ์ (${shortName})`, callback_data: `convert_${t.id}` },
      { text: `📧 ส่งดีล`, callback_data: `deal_${t.id}` }
    ])
  })

  msg += `<i>กดปุ่มเพื่อส่งดีลปิดการขาย หรือให้สิทธิ์เต็มทันที</i>`

  await sendTelegram(msg, { inline_keyboard: buttons })
  return NextResponse.json({ ok: true })
}

// ========== /followup ==========
async function handleFollowUp() {
  await sendTelegram('⏳ กำลังตรวจสอบและประมวลผลระบบปิดการขาย 24 ชม. ...')
  const result = await processTrialFollowUps()

  if (!result.success) {
    await sendTelegram('❌ เกิดข้อผิดพลาดในการประมวลผลระบบติดตาม')
    return NextResponse.json({ ok: true })
  }

  if (result.totalEligible === 0) {
    await sendTelegram('⏰ <b>ตรวจเช็คระบบปิดการขาย 24 ชม.:</b>\n\nยังไม่มีผู้ใช้ที่ทดลองครบ 24 ชม. และค้างอยู่ครับ 👍')
    return NextResponse.json({ ok: true })
  }

  await sendTelegram(
    `🎯 <b>ระบบติดตามปิดการขายอัตโนมัติทำงานสำเร็จ!</b>\n\n` +
    `📊 พบผู้ทดลองครบ 24 ชม.: <b>${result.totalEligible}</b> คน\n` +
    `📨 ส่งอีเมลข้อเสนอพิเศษสำเร็จ: <b>${result.processedCount}</b> คน\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )
  return NextResponse.json({ ok: true })
}

// ========== Callback Handlers ==========
async function handleCallback(query: any) {
  const data = query.data || ''
  const chatId = String(query.message?.chat?.id)
  const messageId = query.message?.message_id

  if (data.startsWith('approve_')) {
    const orderId = data.replace('approve_', '')
    return handleApproveOrder(query.id, chatId, messageId, orderId)
  }

  if (data.startsWith('reject_')) {
    const orderId = data.replace('reject_', '')
    return handleRejectOrder(query.id, chatId, messageId, orderId)
  }

  if (data.startsWith('convert_')) {
    const trialId = data.replace('convert_', '')
    return handleConvertTrial(query.id, chatId, messageId, trialId)
  }

  if (data.startsWith('deal_')) {
    const trialId = data.replace('deal_', '')
    return handleSendDeal(query.id, chatId, messageId, trialId)
  }

  await answerCallback(query.id, 'ไม่รู้จักคำสั่ง')
  return NextResponse.json({ ok: true })
}

async function handleApproveOrder(callbackId: string, chatId: string, messageId: number, orderId: string) {
  // Get order
  const { data: order } = await supabase
    .from('orders')
    .select('*, tools(name)')
    .eq('id', orderId)
    .single()

  if (!order) {
    await answerCallback(callbackId, '❌ ไม่พบออเดอร์')
    return NextResponse.json({ ok: true })
  }

  if (order.status !== 'pending') {
    await answerCallback(callbackId, '⚠️ ออเดอร์นี้ถูกจัดการแล้ว')
    return NextResponse.json({ ok: true })
  }

  // Generate license key
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let keyStr = 'PHM-'
  for (let i = 0; i < 4; i++) keyStr += chars.charAt(Math.floor(Math.random() * chars.length))
  keyStr += '-'
  for (let i = 0; i < 4; i++) keyStr += chars.charAt(Math.floor(Math.random() * chars.length))

  // Create license key
  const { data: newKey, error: keyError } = await supabase
    .from('license_keys')
    .insert({
      tool_id: order.tool_id,
      key_code: keyStr,
      status: 'activated',
      activated_at: new Date().toISOString(),
      activated_by: order.user_id,
      activated_email: order.user_email
    })
    .select()
    .single()

  if (keyError) {
    await answerCallback(callbackId, `❌ สร้าง Key ไม่สำเร็จ`)
    return NextResponse.json({ ok: true })
  }

  // Auto-activate for user
  await supabase.from('user_tools').insert({
    user_id: order.user_id,
    tool_id: order.tool_id,
    license_key_id: newKey.id
  })

  // Update order
  await supabase.from('orders').update({
    status: 'approved',
    approved_at: new Date().toISOString(),
    license_key_id: newKey.id
  }).eq('id', orderId)

  await answerCallback(callbackId, '✅ อนุมัติสำเร็จ!')

  // Update message
  const toolName = (order as any).tools?.name || 'ไม่ระบุ'
  await editMessage(chatId, messageId,
    `✅ <b>อนุมัติแล้ว!</b>\n\n` +
    `📧 ${order.user_email}\n` +
    `🛠️ ${toolName}\n` +
    `🔐 Key: <code>${keyStr}</code>\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )

  return NextResponse.json({ ok: true })
}

async function handleRejectOrder(callbackId: string, chatId: string, messageId: number, orderId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select('*, tools(name)')
    .eq('id', orderId)
    .single()

  if (!order || order.status !== 'pending') {
    await answerCallback(callbackId, '⚠️ ออเดอร์นี้ถูกจัดการแล้ว')
    return NextResponse.json({ ok: true })
  }

  await supabase.from('orders').update({ status: 'rejected' }).eq('id', orderId)

  await answerCallback(callbackId, '❌ ปฏิเสธแล้ว')

  await editMessage(chatId, messageId,
    `❌ <b>ปฏิเสธแล้ว</b>\n\n` +
    `📧 ${order.user_email}\n` +
    `🛠️ ${(order as any).tools?.name || 'ไม่ระบุ'}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )

  return NextResponse.json({ ok: true })
}

async function handleConvertTrial(callbackId: string, chatId: string, messageId: number, trialId: string) {
  const { data: trial } = await supabase
    .from('user_trials')
    .select('user_id, tool_id, user_email, user_name')
    .eq('id', trialId)
    .single()

  if (!trial) {
    await answerCallback(callbackId, '❌ ไม่พบ Trial')
    return NextResponse.json({ ok: true })
  }

  // Generate key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let part1 = '', part2 = ''
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length))
    part2 += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const keyCode = `PHM-${part1}-${part2}`

  // Create activated license key
  await supabase.from('license_keys').insert({
    key_code: keyCode,
    tool_id: trial.tool_id,
    package_type: 'single',
    status: 'activated',
    activated_at: new Date().toISOString(),
    activated_email: trial.user_email,
    note: `จาก Telegram Bot - ${trial.user_name || trial.user_email}`
  })

  // Add user_tools
  await supabase.from('user_tools').upsert({
    user_id: trial.user_id,
    tool_id: trial.tool_id,
  }, { onConflict: 'user_id,tool_id' })

  // Update trial
  await supabase.from('user_trials').update({ status: 'converted' }).eq('id', trialId)

  await answerCallback(callbackId, '✅ ให้สิทธิ์เต็มสำเร็จ!')

  const { data: toolInfo } = await supabase.from('tools').select('name').eq('id', trial.tool_id).single()

  await editMessage(chatId, messageId,
    `✅ <b>ให้สิทธิ์เต็มแล้ว!</b>\n\n` +
    `🙋 ${trial.user_name || ''}\n` +
    `📧 ${trial.user_email}\n` +
    `🛠️ ${toolInfo?.name || 'ไม่ระบุ'}\n` +
    `🔐 Key: <code>${keyCode}</code>\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )

  return NextResponse.json({ ok: true })
}

async function handleSendDeal(callbackId: string, chatId: string, messageId: number, trialId: string) {
  const { data: trial, error } = await supabase
    .from('user_trials')
    .select('*, tools(name, price, slug)')
    .eq('id', trialId)
    .single()

  if (error || !trial) {
    await answerCallback(callbackId, '❌ ไม่พบข้อมูลการทดลองใช้')
    return NextResponse.json({ ok: true })
  }

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
    subject: `🎁 ข้อเสนอพิเศษปลดล็อก ${toolName} เวอร์ชันเต็ม (ตลอดชีพ) - PHEEM AI TOOLKIT`,
    html
  })

  if (!emailRes.success) {
    await answerCallback(callbackId, `❌ ส่งอีเมลไม่สำเร็จ: ${emailRes.error}`)
    return NextResponse.json({ ok: true })
  }

  try {
    await supabase
      .from('user_trials')
      .update({ followup_sent_at: new Date().toISOString() })
      .eq('id', trialId)
  } catch {}

  await answerCallback(callbackId, '✅ ส่งข้อเสนอพิเศษให้ลูกค้าแล้ว!')

  await sendTelegram(
    `📨 <b>ส่งข้อเสนอพิเศษปิดการขายแล้ว!</b>\n\n` +
    `👤 <b>${trial.user_name || 'ลูกค้า'}</b>\n` +
    `📧 ${trial.user_email}\n` +
    `🛠️ ${toolName} (฿${toolPrice || 'พิเศษ'})\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n\n` +
    `<i>ลูกค้าได้รับอีเมลพร้อมลิงก์ปลดล็อกและเลขบัญชีเรียบร้อยแล้วครับ</i>`,
    {
      inline_keyboard: [
        [{ text: '✅ ให้สิทธิ์เต็ม (หากลูกค้าโอนแล้ว)', callback_data: `convert_${trialId}` }]
      ]
    }
  )

  return NextResponse.json({ ok: true })
}

// ========== /broadcast [message] ==========
async function handleBroadcast(text: string) {
  const message = text.replace(/^\/broadcast\s*/i, '').trim()

  if (!message) {
    await sendTelegram(
      `📢 <b>บรอดแคสต์ Facebook Messenger</b>\n\n` +
      `วิธีใช้: <code>/broadcast [ข้อความ]</code>\n\n` +
      `ตัวอย่าง:\n` +
      `<code>/broadcast 🔥 โปรพิเศษวันนี้! ลดราคา 50% ทุกเครื่องมือ</code>\n` +
      `<code>/broadcast สวัสดีครับ! เครื่องมือใหม่พร้อมใช้แล้ว</code>`
    )
    return NextResponse.json({ ok: true })
  }

  // Get contacts
  const { data: contacts } = await supabase
    .from('fb_contacts')
    .select('psid')

  if (!contacts || contacts.length === 0) {
    await sendTelegram('📢 ยังไม่มีรายชื่อลูกค้า Facebook\nรอให้ลูกค้าทักมาก่อนครับ')
    return NextResponse.json({ ok: true })
  }

  await sendTelegram(`📢 กำลังส่ง broadcast ไปยังลูกค้า ${contacts.length} คน...`)

  const psids = contacts.map(c => c.psid)
  const result = await broadcastFBMessage(psids, message, [
    { title: '🌐 เข้าเว็บ', url: 'https://aisalerpro.vercel.app' }
  ])

  // Log broadcast
  try {
    await supabase.from('fb_broadcasts').insert({
      message,
      type: 'text',
      total_contacts: result.total,
      sent_count: result.sent,
      failed_count: result.failed,
      sent_at: new Date().toISOString()
    })
  } catch {}

  await sendTelegram(
    `📢 <b>บรอดแคสต์ Facebook สำเร็จ!</b>\n\n` +
    `📨 ส่งถึง: <b>${result.sent}/${result.total}</b> คน\n` +
    `❌ ล้มเหลว: ${result.failed} คน\n` +
    `💬 ข้อความ: ${message.substring(0, 200)}\n` +
    `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  )

  return NextResponse.json({ ok: true })
}

// ========== /contacts ==========
async function handleContacts() {
  const { data: contacts } = await supabase
    .from('fb_contacts')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(15)

  if (!contacts || contacts.length === 0) {
    await sendTelegram('👥 <b>ยังไม่มีรายชื่อลูกค้า Facebook</b>\n\nรอให้ลูกค้าทักข้อความมาทางเพจก่อนครับ')
    return NextResponse.json({ ok: true })
  }

  const { count: totalCount } = await supabase
    .from('fb_contacts')
    .select('*', { count: 'exact', head: true })

  let msg = `👥 <b>รายชื่อลูกค้า Facebook (${totalCount || contacts.length} คน)</b>\n\n`

  contacts.forEach((c: any, i: number) => {
    const lastMsg = c.last_message_at
      ? new Date(c.last_message_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
      : 'ไม่ทราบ'
    msg += `${i + 1}. <b>${c.name || 'ไม่ทราบชื่อ'}</b>\n`
    msg += `   💬 ข้อความล่าสุด: ${lastMsg}\n\n`
  })

  msg += `<i>พิมพ์ /broadcast [ข้อความ] เพื่อส่งข้อความถึงทุกคน</i>`

  await sendTelegram(msg)
  return NextResponse.json({ ok: true })
}
