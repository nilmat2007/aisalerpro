'use client'

import { useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    site_name: '',
    tagline: '',
    description: '',
    logo_url: '',
    og_image_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        setToast('บันทึกการตั้งค่าสำเร็จ')
        setTimeout(() => setToast(''), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-white text-center p-8">กำลังโหลด...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">ตั้งค่าเว็บไซต์</h1>

      {toast && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 text-green-400 rounded-lg text-center font-medium">
          {toast}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">ชื่อเว็บไซต์ (Site Name)</label>
            <input type="text" value={settings.site_name} onChange={e => setSettings({...settings, site_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">สโลแกน (Tagline)</label>
            <input type="text" value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">คำอธิบายเว็บไซต์ (Description)</label>
            <textarea value={settings.description} onChange={e => setSettings({...settings, description: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white h-24" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">โลโก้ (Logo URL)</label>
            <input type="text" value={settings.logo_url} onChange={e => setSettings({...settings, logo_url: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white mb-2" />
            {settings.logo_url && (
              <div className="mt-2 p-2 bg-slate-950 rounded inline-block">
                <img src={settings.logo_url} alt="Logo Preview" className="h-10 object-contain" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">รูปภาพแชร์ (OG Image URL)</label>
            <input type="text" value={settings.og_image_url} onChange={e => setSettings({...settings, og_image_url: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white" />
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-lg font-medium text-white mb-4">ตัวอย่างส่วนหัวของเว็บไซต์</h3>
            <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 mx-auto mb-4" />
              ) : (
                <div className="text-3xl font-bold text-white mb-4">{settings.site_name || 'ชื่อเว็บไซต์'}</div>
              )}
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                {settings.tagline || 'สโลแกนเว็บไซต์'}
              </h1>
              <p className="text-slate-400 max-w-xl mx-auto">
                {settings.description || 'คำอธิบายเว็บไซต์จะแสดงผลที่นี่...'}
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium">
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
