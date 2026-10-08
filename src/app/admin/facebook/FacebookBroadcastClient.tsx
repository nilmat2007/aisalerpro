'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

interface Contact {
  id: string
  psid: string
  name: string | null
  profile_pic: string | null
  first_message_at: string
  last_message_at: string
}

interface Broadcast {
  id: string
  message: string
  type: string
  total_contacts: number
  sent_count: number
  failed_count: number
  sent_at: string
}

const MESSAGE_TEMPLATES = [
  {
    label: '🔥 โปรโมชั่นพิเศษ (สำหรับคนทักวันนี้)',
    message: '🔥 โปรโมชั่นพิเศษสำหรับคุณ!\n\nเครื่องมือ AI สร้างคลิปวิดีโอ ลดราคาเหลือเพียง ฿699 ซื้อขาดตลอดชีพ! ไม่มีค่ารายเดือน\n\n✅ สร้างคลิปวิดีโอ AI อัตโนมัติ\n✅ ใช้ได้ไม่จำกัด ตลอดชีพ\n✅ รับอัปเดตฟรีตลอด\n\n🛒 สั่งซื้อเลย: https://puppapai.vercel.app/store'
  },
  {
    label: '📲 ดึงคนเข้า LINE OA (สร้างฐานถาวร)',
    message: '🎁 รับสิทธิ์พิเศษเพิ่มเติมทาง LINE!\n\nแอด LINE รับสิทธิ์ทดลองใช้ฟรี 3 คลิป + ปรึกษาเทคนิคการทำคลิป AI ตัวต่อตัวกับทีมงานครับ 😊\n\n👉 กดแอด LINE เลย: https://lin.ee/xxxxx\n(หรือค้นหาไอดี LINE: @puppapai)'
  },
  {
    label: '🎁 แจ้งทดลองใช้ฟรี',
    message: '🎁 ทดลองใช้ฟรี!\n\nสร้างคลิปวิดีโอด้วย AI ฟรี 3 คลิป!\nไม่ต้องจ่ายเงิน ไม่ต้องผูกบัตร\n\nแค่ล็อกอินด้วย Google แล้วกดทดลองใช้ได้เลย 🚀\n\n👉 เข้าใช้งาน: https://puppapai.vercel.app'
  },
  {
    label: '📢 แจ้งอัปเดตเครื่องมือใหม่',
    message: '📢 อัปเดตใหม่!\n\nเครื่องมือสร้างคลิป AI ได้รับการอัปเดตเวอร์ชันใหม่แล้ว! 🎉\n\n🆕 ฟีเจอร์ใหม่:\n• สร้างคลิปเร็วขึ้น 2 เท่า\n• เพิ่มเทมเพลตใหม่ 10+ แบบ\n• ปรับปรุงคุณภาพวิดีโอ\n\nผู้ใช้ทุกคนได้รับอัปเดตฟรีอัตโนมัติ! 🚀\n\n👉 เข้าใช้งาน: https://puppapai.vercel.app'
  },
  {
    label: '💬 ทักทายลูกค้าประจำวัน',
    message: 'สวัสดีครับ! 👋\n\nขอบคุณที่สนใจเครื่องมือ AI ของเรานะครับ\n\nหากมีข้อสงสัยหรือติดปัญหาตรงไหน ทักมาได้เลยครับ เรายินดีช่วยเหลือเสมอ 😊\n\n🌐 เว็บไซต์: https://puppapai.vercel.app'
  },
  {
    label: '⏰ แจ้งเตือนโค้งสุดท้าย',
    message: '⏰ เหลือเวลาอีกไม่กี่ชั่วโมง!\n\nโปรโมชั่นพิเศษกำลังจะหมดเขตแล้วครับ\n\n🛠️ เครื่องมือ AI สร้างคลิปวิดีโอ\n💰 จากราคาปกติ ฿999 เหลือเพียง ฿699 (ซื้อขาดตลอดชีพ)\n\nอย่าพลาดราคานี้! สั่งซื้อก่อนหมดสิทธิ์ 🔥\n\n🛒 สั่งซื้อ: https://puppapai.vercel.app/store'
  }
]

export default function FacebookBroadcastClient() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [reachable, setReachable] = useState(0)
  const [optinCount, setOptinCount] = useState(0)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'broadcast' | 'retargeting' | 'contacts' | 'history'>('broadcast')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/facebook/broadcast')
      const data = await res.json()
      setContacts(data.contacts || [])
      setTotalContacts(data.totalContacts || 0)
      setReachable(data.reachableContacts || 0)
      setOptinCount(data.optinContacts || 0)
      setBroadcasts(data.recentBroadcasts || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function handleBroadcast() {
    if (!message.trim()) {
      Swal.fire('⚠️', 'กรุณาพิมพ์ข้อความ', 'warning')
      return
    }

    const availableRecipients = reachable + optinCount

    if (availableRecipients === 0) {
      const confirmForce = await Swal.fire({
        title: '⚠️ ไม่มีลูกค้าในรอบ 24 ชั่วโมง',
        html: `ขณะนี้ไม่มีลูกค้าที่เพิ่งทักมาภายใน 24 ชม.<br><br>หากต้องการส่งหา<b>ลูกค้าเก่า ${totalContacts.toLocaleString()} คน</b> แนะนำให้ใช้แท็บ <b>"🚀 ลูกค้าเก่า (Sponsored Message)"</b> เพื่อส่งผ่านระบบโฆษณาข้อความ ซึ่งจะส่งถึงทุกคน 100% โดยปลอดภัยครับ`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'ไปดูวิธีส่งหาลูกค้าเก่า',
        cancelButtonText: 'ปิดหน้าต่าง',
        confirmButtonColor: '#06b6d4',
        background: '#0f172a',
        color: '#e2e8f0'
      })
      if (confirmForce.isConfirmed) {
        setTab('retargeting')
      }
      return
    }

    const result = await Swal.fire({
      title: '📢 ยืนยัน Smart Broadcast?',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6;">
          <p>🟢 ระบบจะส่งตรงเข้าแชท: <b>${availableRecipients} คน</b> (ลูกค้า 24 ชม. และผู้รับข่าวสาร)</p>
          <p style="color: #94a3b8; font-size: 12px;">🛡️ ระบบจะละเว้นลูกค้าเก่าที่เกิน 24 ชม. เพื่อป้องกัน Meta ระงับสิทธิ์เพจ</p>
          <div style="background:#1e293b;padding:12px;border-radius:8px;margin-top:10px;max-height:160px;overflow:auto;white-space:pre-wrap;color:#e2e8f0;">${message}</div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `📨 ส่งหา ${availableRecipients} คน`,
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#06b6d4',
      background: '#0f172a',
      color: '#e2e8f0'
    })

    if (!result.isConfirmed) return

    setSending(true)
    Swal.fire({
      title: '📨 กำลังส่ง Broadcast...',
      html: `ส่งตรงเข้า Messenger<br>กรุณารอสักครู่`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      background: '#0f172a',
      color: '#e2e8f0'
    })

    try {
      const res = await fetch('/api/admin/facebook/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const data = await res.json()

      if (data.success) {
        Swal.fire({
          title: '🎉 บรอดแคสต์สำเร็จ!',
          html: `
            <div style="text-align: left; line-height: 1.8;">
              <p>✅ ส่งถึงแชทสำเร็จ: <b style="color:#4ade80">${data.sent}</b> คน</p>
              <p>🛡️ ป้องกันอัตโนมัติ (เกิน 24 ชม.): ${data.skippedOutside24h || 0} คน</p>
              ${data.failed > 0 ? `<p style="color:#f87171">❌ ล้มเหลว: ${data.failed} คน</p>` : ''}
            </div>
          `,
          icon: 'success',
          background: '#0f172a',
          color: '#e2e8f0',
          confirmButtonColor: '#06b6d4'
        })
        setMessage('')
        fetchData()
      } else {
        Swal.fire('❌', data.error || 'เกิดข้อผิดพลาด', 'error')
      }
    } catch (err: any) {
      Swal.fire('❌', err.message, 'error')
    }
    setSending(false)
  }

  function useTemplate(template: typeof MESSAGE_TEMPLATES[0]) {
    setMessage(template.message)
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
  }

  const isContact24h = (lastMsg: string) => {
    if (!lastMsg) return false
    const diff = Date.now() - new Date(lastMsg).getTime()
    return diff < 24 * 60 * 60 * 1000
  }

  const filteredContacts = contacts.filter(c => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (c.name && c.name.toLowerCase().includes(term)) || c.psid.includes(term)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-700/30 rounded-xl p-5">
          <div className="text-blue-400 text-sm font-medium">👥 ฐานลูกค้าสะสมทั้งหมด</div>
          <div className="text-3xl font-bold text-white mt-1">{totalContacts.toLocaleString()}</div>
          <div className="text-blue-400/60 text-xs mt-1">ที่เคยทัก Facebook Page</div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-700/30 rounded-xl p-5">
          <div className="text-green-400 text-sm font-medium">🟢 ส่งฟรีทันที (รอบ 24 ชม.)</div>
          <div className="text-3xl font-bold text-white mt-1">{reachable.toLocaleString()}</div>
          <div className="text-green-400/60 text-xs mt-1">ลูกค้าที่ทักเข้ามาใน 24 ชม.</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-700/30 rounded-xl p-5">
          <div className="text-purple-400 text-sm font-medium">🎟️ ผู้รับข่าวสาร (Opt-in)</div>
          <div className="text-3xl font-bold text-white mt-1">{optinCount.toLocaleString()}</div>
          <div className="text-purple-400/60 text-xs mt-1">ส่งนอก 24 ชม. ได้ตามกฎ Meta</div>
        </div>

        <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 border border-cyan-700/30 rounded-xl p-5">
          <div className="text-cyan-400 text-sm font-medium">📨 ประวัติบรอดแคสต์</div>
          <div className="text-3xl font-bold text-white mt-1">{broadcasts.length}</div>
          <div className="text-cyan-400/60 text-xs mt-1">ครั้งที่เคยส่งในระบบ</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
        {[
          { key: 'broadcast', label: '📢 บรอดแคสต์ (24 ชม. & ข่าวสาร)' },
          { key: 'retargeting', label: '🚀 ส่งหาลูกค้าเก่า 2,206 คน (Sponsored)' },
          { key: 'contacts', label: `👥 รายชื่อลูกค้า (${totalContacts.toLocaleString()})` },
          { key: 'history', label: '📋 ประวัติการส่ง' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-cyan-600/20 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Broadcast Tab */}
      {tab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message Composer */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">✍️ เขียนข้อความบรอดแคสต์</h3>
                <span className="text-xs px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                  พร้อมส่ง {reachable + optinCount} คน
                </span>
              </div>

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={9}
                className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg p-4 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-sm leading-relaxed"
                placeholder="พิมพ์ข้อความที่ต้องการส่งถึงลูกค้าที่นี่..."
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  💡 ส่งฟรีเข้าแชทคนที่ทักใน 24 ชม. และคนที่กดยอมรับข่าวสาร (ปลอดภัย 100%)
                </div>
                <button
                  onClick={handleBroadcast}
                  disabled={sending || !message.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  {sending ? '⏳ กำลังส่ง...' : '📢 ส่ง Smart Broadcast'}
                </button>
              </div>
            </div>
          </div>

          {/* Templates */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">📝 ข้อความสำเร็จรูป</h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {MESSAGE_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => useTemplate(t)}
                  className="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3.5 transition-all group"
                >
                  <div className="font-medium text-white group-hover:text-cyan-400 text-sm">
                    {t.label}
                  </div>
                  <div className="text-slate-400 text-xs mt-1 line-clamp-2">
                    {t.message.substring(0, 80)}...
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Retargeting Tab (The 2,206 Customers Solution) */}
      {tab === 'retargeting' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                  🔥 วิธีการระดับมืออาชีพสำหรับลูกค้าเก่า
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">
                  ส่งข้อความหาลูกค้าเก่าทั้งหมด {totalContacts.toLocaleString()} คน
                </h2>
                <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
                  เนื่องจาก Meta มีกฎป้องกันสแปมห้ามส่งข้อความฟรีหาคนที่ทักเกิน 24 ชม. วิธีที่ถูกต้อง ได้ผล 100% และเพจไม่โดนแบน คือการใช้ <b>Sponsored Message</b> หรือ <b>Custom Audience</b> ผ่าน Meta Ads Manager ครับ
                </p>
              </div>
              <a
                href="/api/admin/facebook/broadcast?export=csv"
                download="facebook_contacts_audience.csv"
                className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 shrink-0"
              >
                <span>📥 ดาวน์โหลดรายชื่อลูกค้า (CSV)</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center">1</div>
              <h4 className="text-white font-semibold">สร้าง Custom Audience ใน 1 นาที</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                เข้าที่ <b>Meta Ads Manager</b> → ไปที่เมนู <b>กลุ่มเป้าหมาย (Audiences)</b> → กด <b>สร้างกลุ่มเป้าหมายที่กำหนดเอง (Custom Audience)</b>
              </p>
              <a
                href="https://adsmanager.facebook.com/adsmanager/audiences"
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-cyan-400 hover:underline pt-1"
              >
                👉 เปิด Meta Ads Manager (Audiences) ↗
              </a>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center">2</div>
              <h4 className="text-white font-semibold">เลือก "คนที่เคยส่งข้อความหาเพจ"</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                เลือกแหล่งที่มาเป็น <b>เพจ Facebook</b> → เลือกเหตุการณ์: <b>"คนที่เคยส่งข้อความหาเพจของคุณ" (People who messaged your Page)</b> และใส่ <b>365 วัน</b>
              </p>
              <div className="bg-slate-950 p-2.5 rounded text-[11px] text-green-400 font-mono">
                ✓ Facebook จะดึงคน 2,206 คนนี้ให้อัตโนมัติทันที
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center">3</div>
              <h4 className="text-white font-semibold">ยิงแอดข้อความเข้าแชทตรงๆ</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                สร้างแคมเปญข้อความ ใช้งบประมาณเพียง <b>50 - 100 บาท</b> ข้อความโปรโมชั่นจะเด้งเข้าแชท Inbox ของลูกค้าเก่าทุกคนเหมือนเพื่อนทักมา ปิดการขายได้ทันที!
              </p>
              <div className="bg-slate-950 p-2.5 rounded text-[11px] text-slate-400">
                💰 ค่าส่งเฉลี่ยเพียง ~0.10 บาทต่อคน ถูกและปลอดภัยที่สุด
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Tab */}
      {tab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              placeholder="🔍 ค้นหาด้วยชื่อ หรือ PSID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 w-full sm:w-72"
            />
            <a
              href="/api/admin/facebook/broadcast?export=csv"
              download="facebook_contacts.csv"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm border border-slate-700 flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              <span>📥 ดาวน์โหลด CSV ({contacts.length} คน)</span>
            </a>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="text-left text-xs font-medium p-3.5">#</th>
                    <th className="text-left text-xs font-medium p-3.5">สถานะ</th>
                    <th className="text-left text-xs font-medium p-3.5">ชื่อลูกค้า</th>
                    <th className="text-left text-xs font-medium p-3.5">PSID</th>
                    <th className="text-left text-xs font-medium p-3.5">ทักล่าสุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {filteredContacts.slice(0, 100).map((c, i) => {
                    const isRecent = isContact24h(c.last_message_at)
                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 text-slate-500 text-xs">{i + 1}</td>
                        <td className="p-3.5">
                          {isRecent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                              🟢 ใน 24 ชม.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              ⚪ ลูกค้าเก่า
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-white font-medium">{c.name || 'ไม่ทราบชื่อ'}</td>
                        <td className="p-3.5">
                          <code className="text-xs text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{c.psid}</code>
                        </td>
                        <td className="p-3.5 text-slate-400 text-xs">
                          {formatDate(c.last_message_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filteredContacts.length > 100 && (
              <div className="text-center py-3 text-slate-500 text-xs border-t border-slate-800">
                แสดง 100 คนแรก จากทั้งหมด {filteredContacts.length.toLocaleString()} คน
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {broadcasts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
              📭 ยังไม่มีประวัติการส่งบรอดแคสต์
            </div>
          ) : (
            broadcasts.map((b) => (
              <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-white text-sm whitespace-pre-wrap">{b.message}</div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="text-green-400 font-medium">📨 ส่งถึง: {b.sent_count} คน</span>
                      {b.failed_count > 0 && (
                        <span className="text-red-400">❌ {b.failed_count} ล้มเหลว</span>
                      )}
                      <span>⏰ {formatDate(b.sent_at)}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-cyan-400 border border-slate-700 shrink-0">
                    Smart Broadcast
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
