'use client'

import { useState, useEffect } from 'react'

export default function LicensesPage() {
  const [tools, setTools] = useState<any[]>([])
  const [licenses, setLicenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyData, setNewKeyData] = useState({ toolId: 'all', packageType: 'lifetime', note: '', quantity: 1 })
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [toolsRes, licensesRes] = await Promise.all([
        fetch('/api/tools'),
        fetch('/api/admin/licenses')
      ])
      const toolsData = await toolsRes.json()
      const licensesData = await licensesRes.json()
      setTools(toolsData.tools || [])
      setLicenses(licensesData.keys || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyData)
      })
      const data = await res.json()
      if (data.keys) {
        setGeneratedKeys(data.keys.map((k: any) => k.key_code))
        fetchData()
        setNewKeyData({ ...newKeyData, note: '' })
      }
    } catch (error) {
      console.error(error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('คัดลอกแล้ว')
  }

  const copyAllKeys = () => {
    navigator.clipboard.writeText(generatedKeys.join('\n'))
    alert('คัดลอกรหัสทั้งหมดแล้ว')
  }

  const revokeKey = async (id: string) => {
    if (!confirm('ยืนยันการยกเลิกรหัสนี้?')) return
    try {
      const res = await fetch(`/api/admin/licenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' })
      })
      if (res.ok) fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) return <div className="p-8 text-white text-center">กำลังโหลด...</div>

  return (
    <div className="p-8 min-h-screen bg-slate-950">
      <h1 className="text-3xl font-bold text-white mb-8">จัดการ License Keys</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-4">สร้างรหัสใหม่</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-slate-400 mb-2">เครื่องมือ</label>
              <select 
                value={newKeyData.toolId}
                onChange={e => setNewKeyData({...newKeyData, toolId: e.target.value})}
                className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
              >
                <option value="all">All-in-One (เข้าถึงได้ทั้งหมด)</option>
                {tools.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-2">จำนวนรหัส (1-20)</label>
                <input 
                  type="number" min="1" max="20"
                  value={newKeyData.quantity}
                  onChange={e => setNewKeyData({...newKeyData, quantity: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-2">ประเภทแพ็กเกจ</label>
                <select 
                  value={newKeyData.packageType}
                  onChange={e => setNewKeyData({...newKeyData, packageType: e.target.value})}
                  className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
                >
                  <option value="lifetime">ตลอดชีพ</option>
                  <option value="1_month">1 เดือน</option>
                  <option value="1_year">1 ปี</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-2">บันทึกช่วยจำ (เช่น ชื่อลูกค้า)</label>
              <input 
                type="text" placeholder="ระบุเพื่อช่วยจำ"
                value={newKeyData.note}
                onChange={e => setNewKeyData({...newKeyData, note: e.target.value})}
                className="w-full bg-slate-800 text-white rounded p-3 border border-slate-700"
              />
            </div>

            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded transition-colors">
              {newKeyData.quantity > 1 ? '+ สร้างแบบหลายรหัส' : '+ สร้างรหัสใหม่'}
            </button>
          </form>
        </div>

        {generatedKeys.length > 0 && (
          <div className="bg-slate-900 p-6 rounded-xl border border-cyan-500/30">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">รหัสที่สร้างล่าสุด</h2>
              <button onClick={copyAllKeys} className="text-sm bg-slate-800 hover:bg-slate-700 text-white py-1 px-3 rounded">
                คัดลอกทั้งหมด
              </button>
            </div>
            <div className="bg-slate-950 p-4 rounded border border-slate-800 h-64 overflow-y-auto space-y-2">
              {generatedKeys.map(key => (
                <div key={key} className="flex justify-between items-center bg-slate-800 p-3 rounded">
                  <code className="text-cyan-400 font-bold">{key}</code>
                  <button onClick={() => copyToClipboard(key)} className="text-slate-400 hover:text-white">📋</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">รายการ License Keys</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead className="bg-slate-950/50">
              <tr>
                <th className="p-4 font-semibold">รหัส</th>
                <th className="p-4 font-semibold">เครื่องมือ</th>
                <th className="p-4 font-semibold">สถานะ</th>
                <th className="p-4 font-semibold">ผู้ใช้งาน</th>
                <th className="p-4 font-semibold">บันทึก</th>
                <th className="p-4 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {licenses.map(lic => (
                <tr key={lic.id} className="hover:bg-slate-800/50">
                  <td className="p-4">
                    <code className="bg-slate-950 px-2 py-1 rounded text-cyan-400">{lic.key_code}</code>
                  </td>
                  <td className="p-4">{lic.tools?.name || 'All-in-One'}</td>
                  <td className="p-4">
                    {lic.status === 'unused' && <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">⏳ ยังไม่ใช้</span>}
                    {lic.status === 'used' && <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">✅ ใช้แล้ว</span>}
                    {lic.status === 'revoked' && <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">❌ ยกเลิก</span>}
                  </td>
                  <td className="p-4">{lic.activated_email || '-'}</td>
                  <td className="p-4">{lic.note || '-'}</td>
                  <td className="p-4">
                    {lic.status === 'unused' && (
                      <button onClick={() => revokeKey(lic.id)} className="text-red-400 hover:text-red-300 text-sm">ยกเลิก</button>
                    )}
                  </td>
                </tr>
              ))}
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">ไม่พบข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
