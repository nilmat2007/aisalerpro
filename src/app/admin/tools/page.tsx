'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { showSuccess, showError, showConfirmDelete, showLoading, closeLoading } from '@/lib/swal'
import { LoadingSpinner } from '@/components/AdminUI'
import { formatToolUpdateDate } from '@/lib/date-utils'

export default function AdminToolsPage() {
  const [tools, setTools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '', slug: '', icon: '', description: '', price: '', password: '',
    version: 'v1.0',
    badge_text: '', badge_color: 'cyan', poster_url: '', logo_url: '', flow_url: '', youtube_url: '',
    is_active: true, is_coming_soon: false, sort_order: 0,
    trial_enabled: false, trial_flow_url: '',
    category: 'hardsell',
    tier_required: 'pro',
    video_model: 'Omni 1.1 Flash · Veo 3.1',
    image_model: 'Nano Banana Pro · Imagen 4',
    tags_string: 'video, image, auto, tiktok'
  })
  const [uploading, setUploading] = useState<string | null>(null)
  const [sendNotify, setSendNotify] = useState(false)
  const [notifyNote, setNotifyNote] = useState('')
  const [sending, setSending] = useState(false)
  const posterRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File, type: 'poster' | 'logo') => {
    setUploading(type)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${type}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('tool-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('tool-images').getPublicUrl(fileName)
      if (type === 'poster') {
        setFormData(prev => ({ ...prev, poster_url: publicUrl }))
      } else {
        setFormData(prev => ({ ...prev, logo_url: publicUrl }))
      }
    } catch (err: any) {
      showError('อัปโหลดไม่สำเร็จ', err.message || 'ลองใหม่')
    } finally {
      setUploading(null)
    }
  }

  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/tools')
      if (res.ok) {
        const data = await res.json()
        setTools(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (tool: any) => {
    const confirmed = await showConfirmDelete(tool.name)
    if (confirmed) {
      showLoading()
      await fetch(`/api/tools/${tool.id}`, { method: 'DELETE' })
      closeLoading()
      showSuccess('ลบเครื่องมือสำเร็จ')
      fetchTools()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingTool ? `/api/tools/${editingTool.id}` : '/api/tools'
    const method = editingTool ? 'PUT' : 'POST'
    
    showLoading()
    const featuresPayload = {
      ...(typeof editingTool?.features === 'object' && !Array.isArray(editingTool?.features) ? editingTool.features : {}),
      category: formData.category || 'video',
      tier_required: formData.tier_required || 'pro',
      models_used: [
        ...(formData.video_model ? [{ type: 'video', name: formData.video_model, customizable: true }] : []),
        ...(formData.image_model ? [{ type: 'image', name: formData.image_model, customizable: true }] : [])
      ],
      tags: formData.tags_string ? formData.tags_string.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    }

    const { category, tier_required, video_model, image_model, tags_string, ...cleanFormData } = formData as any

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cleanFormData,
        features: featuresPayload
      })
    })
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      closeLoading()
      showError('บันทึกไม่สำเร็จ', err.error || 'ลองใหม่')
      return
    }

    const savedTool = await res.json()

    // Send email notification if checked
    if (sendNotify && editingTool) {
      setSending(true)
      try {
        const notifyRes = await fetch('/api/admin/notify-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolId: editingTool.id,
            toolName: formData.name,
            updateNote: notifyNote || undefined
          })
        })
        const notifyData = await notifyRes.json()
        closeLoading()
        if (notifyData.success) {
          showSuccess(`บันทึกสำเร็จ + ${notifyData.message}`)
        } else {
          showError('บันทึกสำเร็จ แต่ส่งอีเมลไม่ได้', notifyData.error)
        }
      } catch (err) {
        closeLoading()
        showError('บันทึกสำเร็จ แต่ส่งอีเมลไม่ได้')
      }
      setSending(false)
    } else {
      closeLoading()
      showSuccess('บันทึกสำเร็จ')
    }
    
    setSendNotify(false)
    setNotifyNote('')
    setIsModalOpen(false)
    fetchTools()
  }

  const openAddModal = () => {
    setEditingTool(null)
    setFormData({
      name: '', slug: '', icon: '', description: '', price: '', password: '',
      version: 'v1.0',
      badge_text: '', badge_color: 'cyan', poster_url: '', logo_url: '', flow_url: '', youtube_url: '',
      is_active: true, is_coming_soon: false, sort_order: 0,
      trial_enabled: false, trial_flow_url: '',
      category: 'hardsell',
      tier_required: 'pro',
      video_model: 'Omni 1.1 Flash · Veo 3.1',
      image_model: 'Nano Banana Pro · Imagen 4',
      tags_string: 'video, image, auto, tiktok'
    })
    setIsModalOpen(true)
  }

  const openEditModal = (tool: any) => {
    setEditingTool(tool)
    const feat = (typeof tool.features === 'object' && tool.features !== null && !Array.isArray(tool.features))
      ? tool.features
      : {}
    const videoModel = feat.models_used?.find((m: any) => m.type === 'video')?.name || ''
    const imageModel = feat.models_used?.find((m: any) => m.type === 'image')?.name || ''
    const tagsStr = Array.isArray(feat.tags) ? feat.tags.join(', ') : ''

    setFormData({
      ...tool,
      category: feat.category || 'video',
      tier_required: feat.tier_required || 'pro',
      video_model: videoModel,
      image_model: imageModel,
      tags_string: tagsStr
    })
    setIsModalOpen(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">จัดการเครื่องมือ</h1>
        <button onClick={openAddModal} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors">
          + เพิ่มเครื่องมือใหม่
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text='กำลังโหลดเครื่องมือ...' />
      ) : (
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-800/50 text-slate-300">
            <tr>
              <th className="p-4 font-medium">รูปภาพ</th>
              <th className="p-4 font-medium">ชื่อ</th>
              <th className="p-4 font-medium">ราคา</th>
              <th className="p-4 font-medium">รหัสผ่าน</th>
              <th className="p-4 font-medium">เวอร์ชัน / อัปเดตล่าสุด</th>
              <th className="p-4 font-medium">สถานะ</th>
              <th className="p-4 font-medium text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tools.map(tool => {
              const updateInfo = formatToolUpdateDate(tool.updated_at)
              return (
                <tr key={tool.id} className="hover:bg-slate-800/20">
                  <td className="p-4">
                    {tool.poster_url ? <img src={tool.poster_url} alt={tool.name} className="w-16 h-10 object-cover rounded" /> : <div className="w-16 h-10 bg-slate-800 rounded"></div>}
                  </td>
                  <td className="p-4 text-white font-medium">
                    <div>{tool.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {tool.features?.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono">
                          {tool.features.category}
                        </span>
                      )}
                      {tool.features?.tier_required && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                          tool.features.tier_required === 'vip' 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                            : tool.features.tier_required === 'starter'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          {tool.features.tier_required.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">{tool.price}</td>
                  <td className="p-4 text-slate-300">{tool.password || '-'}</td>
                  <td className="p-4">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-xs border border-slate-700">
                      {tool.version || 'v1.0'}
                    </span>
                    <div className="text-slate-400 text-xs mt-1">
                      {updateInfo?.text || '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    {tool.is_active ? <span className="text-green-400 text-sm">ใช้งานได้</span> : <span className="text-red-400 text-sm">ปิดใช้งาน</span>}
                    {tool.is_coming_soon && <span className="ml-2 text-purple-400 text-sm">เร็วๆ นี้</span>}
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button onClick={() => openEditModal(tool)} className="text-cyan-400 hover:text-cyan-300">แก้ไข</button>
                    <button onClick={() => handleDelete(tool)} className="text-red-400 hover:text-red-300">ลบ</button>
                  </td>
                </tr>
              )
            })}
            {tools.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">ยังไม่มีเครื่องมือในระบบ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-white mb-6">{editingTool ? 'แก้ไขเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ชื่อเครื่องมือ</label>
                  <input type="text" value={formData.name} onChange={(e) => {
                    setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[\s\W-]+/g, '-')})
                  }} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Slug (URL)</label>
                  <input type="text" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ราคา</label>
                  <input type="text" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">รหัสผ่าน</label>
                  <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-cyan-400 mb-1 font-medium">📦 เวอร์ชัน (Version)</label>
                  <input type="text" placeholder="เช่น v2.8.1" value={formData.version || ''} onChange={(e) => setFormData({...formData, version: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-cyan-500 font-mono text-sm" />
                </div>
              </div>

              {editingTool?.updated_at && (
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-400">🕒 บันทึกอัปเดตล่าสุดเมื่อ:</span>
                  <span className="text-cyan-400 font-medium">
                    {formatToolUpdateDate(editingTool.updated_at)?.text} ({formatToolUpdateDate(editingTool.updated_at)?.fullDate})
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-1">รายละเอียด</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white h-24" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">🖼️ รูปหน้าปก (Poster)</label>
                  <input type="file" ref={posterRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'poster')} />
                  <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => posterRef.current?.click()} disabled={uploading === 'poster'} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm disabled:opacity-50">
                      {uploading === 'poster' ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลดรูป'}
                    </button>
                    {formData.poster_url && <img src={formData.poster_url} alt="poster" className="w-12 h-16 object-cover rounded border border-slate-700" />}
                  </div>
                  {formData.poster_url && <p className="text-xs text-slate-500 mt-1 truncate">{formData.poster_url}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">🎨 โลโก้ (Logo)</label>
                  <input type="file" ref={logoRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
                  <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm disabled:opacity-50">
                      {uploading === 'logo' ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลดรูป'}
                    </button>
                    {formData.logo_url && <img src={formData.logo_url} alt="logo" className="w-12 h-12 object-cover rounded-full border border-slate-700" />}
                  </div>
                  {formData.logo_url && <p className="text-xs text-slate-500 mt-1 truncate">{formData.logo_url}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm text-amber-400 mb-1 font-semibold">🔗 ลิงก์เครื่องมือ (Flow URL) — อัปเดตลิงก์ Tool ใหม่ได้ตรงนี้</label>
                <input type="text" value={formData.flow_url || ''} onChange={(e) => setFormData({...formData, flow_url: e.target.value})} placeholder="https://labs.google/fx/tools/flow/shared/tool/..." className="w-full bg-slate-800 border border-amber-500/50 rounded px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-sm text-red-400 mb-1 font-semibold">▶️ ลิงก์ YouTube ตัวอย่าง — วิดีโอสาธิตการใช้งาน Tool</label>
                <input type="text" value={formData.youtube_url || ''} onChange={(e) => setFormData({...formData, youtube_url: e.target.value})} placeholder="https://www.youtube.com/embed/xxxxx" className="w-full bg-slate-800 border border-red-500/50 rounded px-3 py-2 text-white" />
                <p className="text-xs text-slate-500 mt-1">ใช้ลิงก์ embed เช่น https://www.youtube.com/embed/VIDEO_ID</p>
              </div>

              {/* Flow Tools Studio & AI Models (airefills style) */}
              <div className="border-t border-slate-700 pt-4 mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <h4 className="text-sm font-semibold text-cyan-400">การตั้งค่า Flow Tools & โมเดล AI (สไตล์ AI Refill)</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">🎬 โมเดลวิดีโอ (Video Model)</label>
                    <input 
                      type="text" 
                      value={formData.video_model || ''} 
                      onChange={(e) => setFormData({...formData, video_model: e.target.value})} 
                      placeholder="เช่น Omni 1.1 Flash · Veo 3.1" 
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-cyan-500 text-sm" 
                    />
                    <p className="text-xs text-slate-500 mt-1">แสดงเป็นป้ายโมเดลบนการ์ดเครื่องมือ</p>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">🎨 โมเดลรูปภาพ (Image Model)</label>
                    <input 
                      type="text" 
                      value={formData.image_model || ''} 
                      onChange={(e) => setFormData({...formData, image_model: e.target.value})} 
                      placeholder="เช่น Nano Banana Pro · Imagen 4" 
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-cyan-500 text-sm" 
                    />
                    <p className="text-xs text-slate-500 mt-1">แสดงเป็นป้ายโมเดลภาพบนการ์ด</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">📂 หมวดหมู่เครื่องมือ (Category)</label>
                    <select 
                      value={formData.category || 'video'} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})} 
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-cyan-500 text-sm"
                    >
                      <option value="hardsell">📢 คลิปขายสินค้าดุ (Hardsell Ads)</option>
                      <option value="film">🎬 ละครสั้น / ซีรีส์ (Film & Drama)</option>
                      <option value="podcast">🎙️ พอดแคสต์ AI (Podcast)</option>
                      <option value="showhow">🧼 ทำให้ดู / โชว์สินค้า (Showhow Demo)</option>
                      <option value="minimal">📦 โฆษณามินิมอล (Minimal Ad)</option>
                      <option value="video">🎥 วิดีโอทั่วไป (General Video)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">🔒 ระดับสมาชิกที่เข้าถึงได้ (Tier)</label>
                    <select 
                      value={formData.tier_required || 'pro'} 
                      onChange={(e) => setFormData({...formData, tier_required: e.target.value})} 
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-cyan-500 text-sm"
                    >
                      <option value="starter">🟢 PUP Starter (ทดลองฟรี 3 คลิป)</option>
                      <option value="pro">🔴 PUP Pro Creator (สมาชิกโปร)</option>
                      <option value="vip">👑 PUP Master VIP (สมาชิกสูงสุด)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">🏷️ แท็กฟีเจอร์ (Tags - คั่นด้วยจุลภาค ,)</label>
                  <input 
                    type="text" 
                    value={formData.tags_string || ''} 
                    onChange={(e) => setFormData({...formData, tags_string: e.target.value})} 
                    placeholder="เช่น video, tiktok, ads, auto, ปิดการขาย" 
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-cyan-500 text-sm" 
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-green-400 mb-3">🎁 ระบบทดลองใช้ฟรี</h4>
                <div className="flex items-center gap-3 mb-3">
                  <input type="checkbox" checked={formData.trial_enabled || false} onChange={(e) => setFormData({...formData, trial_enabled: e.target.checked})} className="w-4 h-4 accent-green-500" />
                  <label className="text-sm text-slate-300">เปิดให้ทดลองใช้ฟรี (ลูกค้าต้อง Login ด้วย Gmail ก่อน)</label>
                </div>
                {formData.trial_enabled && (
                  <div>
                    <label className="block text-sm text-green-400 mb-1 font-semibold">🔗 ลิงก์เครื่องมือทดลอง (จำกัด 3 คลิป)</label>
                    <input type="text" value={formData.trial_flow_url || ''} onChange={(e) => setFormData({...formData, trial_flow_url: e.target.value})} placeholder="https://labs.google/fx/tools/flow/shared/tool/..." className="w-full bg-slate-800 border border-green-500/50 rounded px-3 py-2 text-white" />
                    <p className="text-xs text-slate-500 mt-1">ลิงก์ Tool ที่จำกัดการใช้งาน (เช่น 3 คลิป) สำหรับให้ลูกค้าทดลอง</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Badge Text</label>
                  <input type="text" value={formData.badge_text} onChange={(e) => setFormData({...formData, badge_text: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Badge Color</label>
                  <select value={formData.badge_color} onChange={(e) => setFormData({...formData, badge_color: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white">
                    <option value="cyan">Cyan</option>
                    <option value="purple">Purple</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500" />
                  <span className="text-white">เปิดใช้งาน</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_coming_soon} onChange={(e) => setFormData({...formData, is_coming_soon: e.target.checked})} className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-purple-500" />
                  <span className="text-white">เร็วๆ นี้</span>
                </label>
              </div>

              {/* Email Notification */}
              {editingTool && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={sendNotify} onChange={(e) => setSendNotify(e.target.checked)} className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-green-500" />
                    <span className="text-green-400 font-semibold text-sm">📧 ส่งอีเมลแจ้งลูกค้าที่ซื้อ Tool นี้</span>
                  </label>
                  {sendNotify && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">ข้อความแจ้ง (ไม่ใส่ก็ได้ ระบบจะใช้ข้อความเริ่มต้น)</label>
                      <textarea
                        value={notifyNote}
                        onChange={(e) => setNotifyNote(e.target.value)}
                        placeholder="เช่น อัปเดต UI ใหม่ เพิ่มฟีเจอร์ xxx..."
                        className="w-full bg-slate-800 border border-green-500/30 rounded px-3 py-2 text-white text-sm h-20 resize-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => { setIsModalOpen(false); setSendNotify(false); setNotifyNote('') }} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" disabled={sending} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {sending ? '⏳ กำลังส่งอีเมล...' : sendNotify ? '💾 บันทึก + ส่งอีเมล' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
