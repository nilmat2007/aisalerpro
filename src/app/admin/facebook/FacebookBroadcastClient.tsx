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
    label: '🔥 โปรโมชั่นพิเศษ',
    message: '🔥 โปรโมชั่นพิเศษ!\n\nเครื่องมือ AI สร้างคลิปวิดีโอ ลดราคาเหลือเพียง ฿699 ซื้อขาดตลอดชีพ! ไม่มีค่ารายเดือน\n\n✅ สร้างคลิปวิดีโอ AI อัตโนมัติ\n✅ ใช้ได้ไม่จำกัด ตลอดชีพ\n✅ รับอัปเดตฟรีตลอด\n\n🛒 สั่งซื้อเลย: https://aisalerpro.vercel.app/store'
  },
  {
    label: '🎁 แจ้งทดลองใช้ฟรี',
    message: '🎁 ทดลองใช้ฟรี!\n\nสร้างคลิปวิดีโอด้วย AI ฟรี 3 คลิป!\nไม่ต้องจ่ายเงิน ไม่ต้องผูกบัตร\n\nแค่ล็อกอินด้วย Google แล้วกดทดลองใช้ได้เลย 🚀\n\n👉 เข้าใช้งาน: https://aisalerpro.vercel.app'
  },
  {
    label: '📢 แจ้งอัปเดตเครื่องมือใหม่',
    message: '📢 อัปเดตใหม่!\n\nเครื่องมือสร้างคลิป AI ได้รับการอัปเดตเวอร์ชันใหม่แล้ว! 🎉\n\n🆕 ฟีเจอร์ใหม่:\n• สร้างคลิปเร็วขึ้น 2 เท่า\n• เพิ่มเทมเพลตใหม่ 10+ แบบ\n• ปรับปรุงคุณภาพวิดีโอ\n\nผู้ใช้ทุกคนได้รับอัปเดตฟรีอัตโนมัติ! 🚀\n\n👉 เข้าใช้งาน: https://aisalerpro.vercel.app'
  },
  {
    label: '💬 ทักทายลูกค้า',
    message: 'สวัสดีครับ! 👋\n\nขอบคุณที่สนใจเครื่องมือ AI ของเรานะครับ\n\nหากมีคำถามหรือต้องการความช่วยเหลือ ทักมาได้เลยครับ เรายินดีช่วยเหลือเสมอ 😊\n\n🌐 เว็บไซต์: https://aisalerpro.vercel.app'
  },
  {
    label: '⏰ แจ้งเตือนหมดเขตโปรโมชั่น',
    message: '⏰ เหลือเวลาอีก 24 ชม.!\n\nโปรโมชั่นพิเศษกำลังจะหมดเขต!\n\n🛠️ เครื่องมือ AI สร้างคลิปวิดีโอ\n💰 ราคาปกติ ฿999 → เหลือ ฿699\n🎯 ซื้อขาดตลอดชีพ ไม่มีค่ารายเดือน\n\nอย่าพลาด! สั่งซื้อก่อนหมดเขต 🔥\n\n🛒 สั่งซื้อ: https://aisalerpro.vercel.app/store'
  },
  {
    label: '🏆 รีวิวจากลูกค้า',
    message: '🏆 ลูกค้าพูดถึงเรา!\n\n"ใช้งานง่ายมาก สร้างคลิปได้เร็ว คุณภาพดี คุ้มค่ากับราคา!" ⭐⭐⭐⭐⭐\n\nเครื่องมือ AI สร้างคลิปวิดีโอที่ใช้ง่ายที่สุด\nซื้อขาดครั้งเดียว ใช้ได้ตลอดชีพ!\n\n🎁 ทดลองใช้ฟรี: https://aisalerpro.vercel.app'
  }
]

export default function FacebookBroadcastClient() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [reachable, setReachable] = useState(0)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'broadcast' | 'contacts' | 'history'>('broadcast')

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

    const result = await Swal.fire({
      title: '📢 ยืนยันบรอดแคสต์?',
      html: `ส่งข้อความถึงลูกค้า <b>${totalContacts} คน</b><br><br><div style="text-align:left;background:#1e293b;padding:12px;border-radius:8px;max-height:200px;overflow:auto;white-space:pre-wrap;font-size:14px">${message}</div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '📨 ส่งเลย!',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#06b6d4',
      background: '#0f172a',
      color: '#e2e8f0'
    })

    if (!result.isConfirmed) return

    setSending(true)
    Swal.fire({
      title: '📨 กำลังส่ง...',
      html: `ส่งข้อความถึง ${totalContacts} คน<br>อาจใช้เวลาสักครู่`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      background: '#0f172a',
      color: '#e2e8f0'
    })

    try {
      const res = await fetch('/api/admin/facebook/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type: 'text' })
      })
      const data = await res.json()

      if (data.success) {
        Swal.fire({
          title: '🎉 บรอดแคสต์สำเร็จ!',
          html: `📨 ส่งถึง: <b>${data.sent}/${data.total}</b> คน<br>❌ ล้มเหลว: ${data.failed} คน`,
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
    return new Date(dateStr).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
  }

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-700/30 rounded-xl p-5">
          <div className="text-blue-400 text-sm">👥 ลูกค้าทั้งหมด</div>
          <div className="text-3xl font-bold text-white mt-1">{totalContacts.toLocaleString()}</div>
          <div className="text-blue-400/60 text-xs mt-1">จาก Facebook Messenger</div>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-700/30 rounded-xl p-5">
          <div className="text-green-400 text-sm">✅ ส่งถึงได้ (24 ชม.)</div>
          <div className="text-3xl font-bold text-white mt-1">{reachable.toLocaleString()}</div>
          <div className="text-green-400/60 text-xs mt-1">ทักข้อความภายใน 24 ชม.</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 border border-cyan-700/30 rounded-xl p-5">
          <div className="text-cyan-400 text-sm">📨 บรอดแคสต์ทั้งหมด</div>
          <div className="text-3xl font-bold text-white mt-1">{broadcasts.length}</div>
          <div className="text-cyan-400/60 text-xs mt-1">ครั้ง</div>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-700/30 rounded-xl p-5">
          <div className="text-green-400 text-sm">📊 อัตราส่งสำเร็จ</div>
          <div className="text-3xl font-bold text-white mt-1">
            {broadcasts.length > 0
              ? Math.round((broadcasts.reduce((a, b) => a + b.sent_count, 0) / Math.max(broadcasts.reduce((a, b) => a + b.total_contacts, 0), 1)) * 100)
              : 0}%
          </div>
          <div className="text-green-400/60 text-xs mt-1">เฉลี่ย</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { key: 'broadcast', label: '📢 บรอดแคสต์', icon: '' },
          { key: 'contacts', label: '👥 รายชื่อลูกค้า', icon: '' },
          { key: 'history', label: '📋 ประวัติส่ง', icon: '' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
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
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">✍️ เขียนข้อความ</h3>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={10}
                className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg p-4 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none"
                placeholder="พิมพ์ข้อความบรอดแคสต์ที่นี่..."
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-slate-400 text-sm">
                  📨 จะส่งถึง <span className="text-cyan-400 font-bold">{totalContacts.toLocaleString()}</span> คน
                  {reachable < totalContacts && (
                    <span className="text-yellow-400 ml-2">(ส่งได้จริง ~{reachable} คนที่ทักใน 24 ชม.)</span>
                  )}
                </span>
                <button
                  onClick={handleBroadcast}
                  disabled={sending || !message.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {sending ? '⏳ กำลังส่ง...' : '📢 ส่ง Broadcast'}
                </button>
              </div>
            </div>
          </div>

          {/* Templates */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">📝 ข้อความสำเร็จรูป</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {MESSAGE_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => useTemplate(t)}
                  className="w-full text-left bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-cyan-600/50 rounded-lg p-3 transition-all group"
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

      {/* Contacts Tab */}
      {tab === 'contacts' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left text-xs text-slate-400 font-medium p-3">#</th>
                  <th className="text-left text-xs text-slate-400 font-medium p-3">ชื่อ</th>
                  <th className="text-left text-xs text-slate-400 font-medium p-3">PSID</th>
                  <th className="text-left text-xs text-slate-400 font-medium p-3">ข้อความแรก</th>
                  <th className="text-left text-xs text-slate-400 font-medium p-3">ข้อความล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {contacts.slice(0, 50).map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-3">
                      <span className="text-white text-sm">{c.name || 'ไม่ทราบชื่อ'}</span>
                    </td>
                    <td className="p-3">
                      <code className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded">{c.psid}</code>
                    </td>
                    <td className="p-3 text-slate-400 text-xs">
                      {c.first_message_at ? formatDate(c.first_message_at) : '-'}
                    </td>
                    <td className="p-3 text-slate-400 text-xs">
                      {c.last_message_at ? formatDate(c.last_message_at) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalContacts > 50 && (
            <div className="text-center py-3 text-slate-400 text-sm border-t border-slate-700">
              แสดง 50 จาก {totalContacts.toLocaleString()} คน
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {broadcasts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              📭 ยังไม่มีประวัติบรอดแคสต์
            </div>
          ) : (
            broadcasts.map((b) => (
              <div key={b.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-white text-sm whitespace-pre-wrap">{b.message}</div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>📨 {b.sent_count}/{b.total_contacts} คน</span>
                      {b.failed_count > 0 && (
                        <span className="text-red-400">❌ {b.failed_count} ล้มเหลว</span>
                      )}
                      <span>⏰ {formatDate(b.sent_at)}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    b.failed_count === 0
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-yellow-900/50 text-yellow-400'
                  }`}>
                    {b.failed_count === 0 ? '✅ สำเร็จ' : '⚠️ บางส่วน'}
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
