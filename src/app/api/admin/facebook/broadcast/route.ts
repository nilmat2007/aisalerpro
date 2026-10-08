import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { broadcastFBSmart } from '@/lib/facebook'
import { sendTelegram } from '@/lib/telegram'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, buttons, target = 'safe_24h' } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุข้อความ' }, { status: 400 })
    }

    // 1. Fetch all contacts
    const { data: contacts, error } = await supabase
      .from('fb_contacts')
      .select('psid, name, last_message_at')
      .order('last_message_at', { ascending: false })

    if (error || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'ไม่มีรายชื่อผู้ติดต่อ' }, { status: 400 })
    }

    // 2. Fetch any valid Opt-in tokens
    let optinMap = new Map<string, string>()
    try {
      const { data: optins } = await supabase
        .from('fb_optins')
        .select('psid, token')
      if (optins) {
        optins.forEach((o: any) => optinMap.set(o.psid, o.token))
      }
    } catch {}

    const preparedContacts = contacts.map(c => ({
      psid: c.psid,
      last_message_at: c.last_message_at,
      optin_token: optinMap.get(c.psid)
    }))

    // 3. Format buttons
    const fbButtons = buttons?.map((b: any) => ({
      title: b.title,
      url: b.url
    })) || [
      { title: '🌐 เข้าสู่เว็บไซต์', url: 'https://puppapai.vercel.app' }
    ]

    // 4. Smart broadcast
    const result = await broadcastFBSmart(preparedContacts, message, fbButtons)

    // 5. Log broadcast
    try {
      await supabase.from('fb_broadcasts').insert({
        message,
        type: 'smart_broadcast',
        total_contacts: result.total,
        sent_count: result.sent,
        failed_count: result.failed,
        sent_at: new Date().toISOString()
      })
    } catch {}

    // 6. Notify admin via Telegram
    await sendTelegram(
      `📢 <b>Facebook Smart Broadcast สำเร็จ!</b>\n\n` +
      `📨 ส่งถึงแชทสำเร็จ: <b>${result.sent}</b> คน\n` +
      `🛡️ ละเว้นอัตโนมัติ (เกิน 24 ชม.): ${result.skippedOutside24h} คน\n` +
      `❌ ล้มเหลว: ${result.failed} คน\n` +
      `💬 ข้อความ: ${message.substring(0, 100)}\n` +
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

// GET: ดึงข้อมูลสรุป หรือดาวน์โหลด CSV
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const isExport = url.searchParams.get('export') === 'csv'

    const { data: contacts } = await supabase
      .from('fb_contacts')
      .select('*')
      .order('last_message_at', { ascending: false })

    // If CSV export requested:
    if (isExport) {
      let csv = 'PSID,Name,First_Message_At,Last_Message_At\n'
      for (const c of contacts || []) {
        const safeName = (c.name || 'Unknown').replace(/"/g, '""')
        csv += `"${c.psid}","${safeName}","${c.first_message_at || ''}","${c.last_message_at || ''}"\n`
      }

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="facebook_contacts_audience.csv"'
        }
      })
    }

    const { data: broadcasts } = await supabase
      .from('fb_broadcasts')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10)

    // Count reachable contacts (messaged within last 24 hours)
    const now = new Date()
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const reachable = (contacts || []).filter(c => c.last_message_at && c.last_message_at >= h24ago).length

    // Count opt-in tokens
    let optinCount = 0
    try {
      const { count } = await supabase
        .from('fb_optins')
        .select('*', { count: 'exact', head: true })
      optinCount = count || 0
    } catch {}

    return NextResponse.json({
      contacts: contacts || [],
      totalContacts: contacts?.length || 0,
      reachableContacts: reachable,
      optinContacts: optinCount,
      recentBroadcasts: broadcasts || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
