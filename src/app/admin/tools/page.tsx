'use client'

import { useState, useEffect } from 'react'

export default function AdminToolsPage() {
  const [tools, setTools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '', slug: '', icon: '', description: '', price: '', password: '',
    badge_text: '', badge_color: 'cyan', poster_url: '', logo_url: '',
    is_active: true, is_coming_soon: false, sort_order: 0
  })

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

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบเครื่องมือนี้ใช่หรือไม่?')) {
      await fetch(`/api/tools/${id}`, { method: 'DELETE' })
      fetchTools()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingTool ? `/api/tools/${editingTool.id}` : '/api/tools'
    const method = editingTool ? 'PUT' : 'POST'
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    setIsModalOpen(false)
    fetchTools()
  }

  const openAddModal = () => {
    setEditingTool(null)
    setFormData({
      name: '', slug: '', icon: '', description: '', price: '', password: '',
      badge_text: '', badge_color: 'cyan', poster_url: '', logo_url: '',
      is_active: true, is_coming_soon: false, sort_order: 0
    })
    setIsModalOpen(true)
  }

  const openEditModal = (tool: any) => {
    setEditingTool(tool)
    setFormData(tool)
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

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-800/50 text-slate-300">
            <tr>
              <th className="p-4 font-medium">รูปภาพ</th>
              <th className="p-4 font-medium">ชื่อ</th>
              <th className="p-4 font-medium">ราคา</th>
              <th className="p-4 font-medium">รหัสผ่าน</th>
              <th className="p-4 font-medium">สถานะ</th>
              <th className="p-4 font-medium text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tools.map(tool => (
              <tr key={tool.id} className="hover:bg-slate-800/20">
                <td className="p-4">
                  {tool.poster_url ? <img src={tool.poster_url} alt={tool.name} className="w-16 h-10 object-cover rounded" /> : <div className="w-16 h-10 bg-slate-800 rounded"></div>}
                </td>
                <td className="p-4 text-white font-medium">{tool.name}</td>
                <td className="p-4 text-slate-300">{tool.price}</td>
                <td className="p-4 text-slate-300">{tool.password || '-'}</td>
                <td className="p-4">
                  {tool.is_active ? <span className="text-green-400 text-sm">ใช้งานได้</span> : <span className="text-red-400 text-sm">ปิดใช้งาน</span>}
                  {tool.is_coming_soon && <span className="ml-2 text-purple-400 text-sm">เร็วๆ นี้</span>}
                </td>
                <td className="p-4 text-right space-x-3">
                  <button onClick={() => openEditModal(tool)} className="text-cyan-400 hover:text-cyan-300">แก้ไข</button>
                  <button onClick={() => handleDelete(tool.id)} className="text-red-400 hover:text-red-300">ลบ</button>
                </td>
              </tr>
            ))}
            {tools.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">ยังไม่มีเครื่องมือในระบบ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ราคา</label>
                  <input type="text" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">รหัสผ่าน</label>
                  <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">รายละเอียด</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white h-24" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Poster URL (รูปหน้าปก)</label>
                  <input type="text" value={formData.poster_url} onChange={(e) => setFormData({...formData, poster_url: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Logo URL</label>
                  <input type="text" value={formData.logo_url} onChange={(e) => setFormData({...formData, logo_url: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
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

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
