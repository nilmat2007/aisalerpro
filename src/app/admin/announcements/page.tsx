'use client'

import { useState, useEffect } from 'react'

export default function AnnouncementsPage() {
  const [tools, setTools] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [formData, setFormData] = useState({
    title: '', content: '', tool_id: 'null', badge_text: 'ประกาศ', badge_color: 'bg-blue-500'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [toolsRes, annRes] = await Promise.all([
        fetch('/api/tools'),
        fetch('/api/admin/announcements')
      ])
      const toolsData = await toolsRes.json()
      const annData = await annRes.json()
      
      // API /api/tools returns array directly, not { tools: [...] }
      setTools(Array.isArray(toolsData) ? toolsData : (toolsData.tools || []))
      setAnnouncements(annData.announcements || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        fetchData()
        setFormData({ title: '', content: '', tool_id: 'null', badge_text: 'ประกาศ', badge_color: 'bg-blue-500' })
      } else {
        alert('สร้างประกาศไม่สำเร็จ: ' + (data.error || 'ลองใหม่'))
      }
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบประกาศนี้?')) return
    try {
      await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) return <div className="p-8 text-white text-center">กำลังโหลด...</div>

  return (
    <div className="p-8 min-h-screen bg-slate-950">
      <h1 className="text-3xl font-bold text-white mb-8">จัดการประกาศ</h1>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">สร้างประกาศใหม่</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 mb-2">หัวข้อประกาศ</label>
            <input 
              type="text" required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
            />
          </div>
          
          <div>
            <label className="block text-slate-400 mb-2">รายละเอียด</label>
            <textarea 
              required rows={3}
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-2">แสดงในเครื่องมือ</label>
              <select 
                value={formData.tool_id}
                onChange={e => setFormData({...formData, tool_id: e.target.value})}
                className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
              >
                <option value="null">แสดงทุกหน้า (ทั่วไป)</option>
                {tools.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-slate-400 mb-2">ข้อความป้ายกำกับ</label>
              <input 
                type="text" 
                value={formData.badge_text}
                onChange={e => setFormData({...formData, badge_text: e.target.value})}
                className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-2">สีป้ายกำกับ</label>
              <select 
                value={formData.badge_color}
                onChange={e => setFormData({...formData, badge_color: e.target.value})}
                className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
              >
                <option value="bg-blue-500">น้ำเงิน (ข้อมูล)</option>
                <option value="bg-green-500">เขียว (สำเร็จ/อัปเดต)</option>
                <option value="bg-yellow-500">เหลือง (แจ้งเตือน)</option>
                <option value="bg-red-500">แดง (ด่วน/สำคัญ)</option>
                <option value="bg-purple-500">ม่วง (ฟีเจอร์ใหม่)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded transition-colors">
            📢 สร้างประกาศ
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">รายการประกาศ</h2>
        {announcements.map(ann => (
          <div key={ann.id} className={`bg-slate-900 p-6 rounded-xl border ${ann.status === 'active' ? 'border-purple-500/30' : 'border-slate-800 opacity-60'}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${ann.badge_color} text-white text-xs px-2 py-1 rounded-full font-bold`}>
                    {ann.badge_text}
                  </span>
                  {ann.tool_id ? (
                    <span className="text-xs text-slate-400 border border-slate-700 px-2 py-1 rounded">
                      สำหรับ: {ann.tools?.name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 border border-slate-700 px-2 py-1 rounded">
                      ทั่วไป
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{ann.title}</h3>
                <p className="text-slate-400 text-sm whitespace-pre-wrap">{ann.content}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button 
                  onClick={() => toggleStatus(ann.id, ann.status)}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    ann.status === 'active' ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-800 text-green-400 hover:bg-slate-700'
                  }`}
                >
                  {ann.status === 'active' ? 'ซ่อน' : 'แสดง'}
                </button>
                <button 
                  onClick={() => handleDelete(ann.id)}
                  className="px-3 py-1 rounded text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center p-8 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
            ยังไม่มีประกาศ
          </div>
        )}
      </div>
    </div>
  )
}
