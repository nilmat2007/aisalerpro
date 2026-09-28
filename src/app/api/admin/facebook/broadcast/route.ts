import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { broadcastFBMessage, sendFBCard } from '@/lib/facebook'
import { sendTelegram } from '@/lib/telegram'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, buttons, type, toolSlug } = body

    // type: 'text' | 'promo' | 'update'

    // 1. Fetch all contacts
    const { data: contacts, error } = await supabase
      .from('fb_contacts')
      .select('psid, name')
      .order('last_message_at', { ascending: false })

    if (error || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'ไม่มีรายชื่อผู้ติดต่อ' }, { status: 400 })
    }

    const psids = contacts.map(c => c.psid)

    // 2. Broadcast
    let result

    if (type === 'promo' && toolSlug) {
      // Fetch tool info for promo card
      const { data: tool } = await supabase
        .from('tools')
        .select('name, price, slug, poster_url')
        .eq('slug', toolSlug)
        .single()

      if (tool) {
        // Send card with promo to each contact
        let sent = 0, failed = 0
        const errors: string[] = []

        for (const psid of psids) {
          const res = await sendFBCard(psid, {
            title: `🔥 ${tool.name}`,
            subtitle: `💰 ราคา ฿${tool.price} (ซื้อขาดตลอดชีพ)\n${message || 'ปลดล็อกเวอร์ชันเต็ม สร้างคลิปไม่จำกัด!'}`,
            imageUrl: tool.poster_url || undefined,
            buttons: [
              { title: '🛒 สั่งซื้อเลย', url: `https://aisalerpro.vercel.app/checkout/${tool.slug}` },
              { title: '🎁 ทดลองใช้ฟรี', url: 'https://aisalerpro.vercel.app' }
            ]
          })
          if (res.success) sent++
          else { failed++; errors.push(`${psid}: ${res.error}`) }
          await new Promise(r => setTimeout(r, 100))
        }

        result = { total: psids.length, sent, failed, errors }
      } else {
        return NextResponse.json({ error: `ไม่พบเครื่องมือ ${toolSlug}` }, { status: 404 })
      }
    } else {
      // Simple text broadcast (with optional buttons)
      const fbButtons = buttons?.map((b: any) => ({
        title: b.title,
        url: b.url
      })) || [
        { title: '🌐 เข้าเว็บ', url: 'https://aisalerpro.vercel.app' }
      ]

      result = await broadcastFBMessage(psids, message, fbButtons)
    }

    // 3. Log broadcast
    await supabase.from('fb_broadcasts').insert({
      message: message || 'Promo card',
      type: type || 'text',
      total_contacts: result.total,
      sent_count: result.sent,
      failed_count: result.failed,
      sent_at: new Date().toISOString()
    })

    // 4. Notify admin
    await sendTelegram(
      `📢 <b>Broadcast Facebook สำเร็จ!</b>\n\n` +
      `📨 ส่งถึง: <b>${result.sent}/${result.total}</b> คน\n` +
      `❌ ล้มเหลว: ${result.failed} คน\n` +
      `💬 ข้อความ: ${(message || 'Promo card').substring(0, 100)}\n` +
      `⏰ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
    )

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: ดึงรายชื่อผู้ติดต่อทั้งหมด
export async function GET() {
  try {
    const { data: contacts } = await supabase
      .from('fb_contacts')
      .select('*')
      .order('last_message_at', { ascending: false })

    const { data: broadcasts } = await supabase
      .from('fb_broadcasts')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      contacts: contacts || [],
      totalContacts: contacts?.length || 0,
      recentBroadcasts: broadcasts || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
