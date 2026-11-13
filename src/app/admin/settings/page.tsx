'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    site_name: '',
    tagline: '',
    description: '',
    logo_url: '',
    og_image_url: '',
    favicon_url: '',
    line_oa_url: ''
  })

  const [aiConfig, setAiConfig] = useState({
    ai_slip_enabled: true,
    has_gemini_key: false,
    gemini_key_masked: '',
    gemini_api_key_input: '',
    max_slip_age_minutes: 30,
    slipok_api_url: '',
    has_slipok_key: false,
    slipok_key_masked: '',
    slipok_api_key_input: '',
    admin_bypass_enabled: false,
    admin_bypass_emails_input: 'nilmat2007@gmail.com, nilmat200757@gmail.com',
  })

  const [togglingBypass, setTogglingBypass] = useState(false)
  const [showAdvancedSlipOk, setShowAdvancedSlipOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  
  const logoRef = useRef<HTMLInputElement>(null)
  const ogRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File, type: 'logo' | 'og' | 'favicon') => {
    setUploading(type)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `site_${type}_${Date.now()}.${ext}`
      
      const { error } = await supabase.storage.from('tool-images').upload(fileName, file)
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage.from('tool-images').getPublicUrl(fileName)
      
      const newSettings = { ...settings }
      if (type === 'logo') {
        newSettings.logo_url = publicUrl
      } else if (type === 'og') {
        newSettings.og_image_url = publicUrl
      } else if (type === 'favicon') {
        newSettings.favicon_url = publicUrl
      }
      setSettings(newSettings)
      
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      if (res.ok) {
        setToast('อัปโหลดและบันทึกสำเร็จ ✅')
        setTimeout(() => setToast(''), 3000)
      }
    } catch (err: any) {
      alert('อัปโหลดไม่สำเร็จ: ' + (err.message || 'ลองใหม่'))
    } finally {
      setUploading(null)
    }
  }

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings({
            site_name: data.site_name || '',
            tagline: data.tagline || '',
            description: data.description || '',
            logo_url: data.logo_url || '',
            og_image_url: data.og_image_url || '',
            favicon_url: data.favicon_url || '',
            line_oa_url: data.line_oa_url || '',
          })
          if (data.ai_slip_config) {
            setAiConfig(prev => ({
              ...prev,
              ai_slip_enabled:
                typeof data.ai_slip_config.ai_slip_enabled === 'boolean'
                  ? data.ai_slip_config.ai_slip_enabled
                  : true,
              has_gemini_key: Boolean(data.ai_slip_config.has_gemini_key),
              gemini_key_masked: data.ai_slip_config.gemini_key_masked || '',
              max_slip_age_minutes: Number(data.ai_slip_config.max_slip_age_minutes) || 30,
              slipok_api_url: data.ai_slip_config.slipok_api_url || '',
              has_slipok_key: Boolean(data.ai_slip_config.has_slipok_key),
              slipok_key_masked: data.ai_slip_config.slipok_key_masked || '',
              admin_bypass_enabled: Boolean(data.ai_slip_config.admin_bypass_enabled),
              admin_bypass_emails_input: Array.isArray(data.ai_slip_config.admin_bypass_emails)
                ? data.ai_slip_config.admin_bypass_emails.join(', ')
                : 'nilmat2007@gmail.com, nilmat200757@gmail.com',
            }))
          }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleQuickToggleBypass = async (nextEnabled: boolean) => {
    setTogglingBypass(true)
    setAiConfig(prev => ({ ...prev, admin_bypass_enabled: nextEnabled }))
    try {
      const payload = {
        ...settings,
        ai_slip_config: {
          ai_slip_enabled: aiConfig.ai_slip_enabled,
          gemini_api_key: '__KEEP__',
          max_slip_age_minutes: aiConfig.max_slip_age_minutes,
          slipok_api_url: aiConfig.slipok_api_url.trim(),
          slipok_api_key: '__KEEP__',
          admin_bypass_enabled: nextEnabled,
          admin_bypass_emails: aiConfig.admin_bypass_emails_input,
        },
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (res.ok && result?.ai_slip_config) {
        setAiConfig(prev => ({
          ...prev,
          admin_bypass_enabled: Boolean(result.ai_slip_config.admin_bypass_enabled),
          admin_bypass_emails_input: Array.isArray(result.ai_slip_config.admin_bypass_emails)
            ? result.ai_slip_config.admin_bypass_emails.join(', ')
            : prev.admin_bypass_emails_input,
        }))
        setToast(
          nextEnabled
            ? '🟢 เปิดโหมดแอดมินปลดล็อกทุกลิงก์เรียบร้อย! (อีเมลแอดมินเห็นทุกเครื่องมือ & คอร์สเรียน)'
            : '🔒 ปิดโหมดแอดมินเรียบร้อย! (จำลองมุมมองลูกค้าจริง 100% — เห็นเฉพาะที่ซื้อจริง)'
        )
        setTimeout(() => setToast(''), 4000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTogglingBypass(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const payload = {
        ...settings,
        ai_slip_config: {
          ai_slip_enabled: aiConfig.ai_slip_enabled,
          gemini_api_key: aiConfig.gemini_api_key_input.trim()
            ? aiConfig.gemini_api_key_input.trim()
            : '__KEEP__',
          max_slip_age_minutes: aiConfig.max_slip_age_minutes,
          slipok_api_url: aiConfig.slipok_api_url.trim(),
          slipok_api_key: aiConfig.slipok_api_key_input.trim()
            ? aiConfig.slipok_api_key_input.trim()
            : '__KEEP__',
          admin_bypass_enabled: aiConfig.admin_bypass_enabled,
          admin_bypass_emails: aiConfig.admin_bypass_emails_input,
        },
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const result = await res.json()
      if (res.ok) {
        if (result?.ai_slip_config) {
          setAiConfig(prev => ({
            ...prev,
            ai_slip_enabled: result.ai_slip_config.ai_slip_enabled,
            has_gemini_key: Boolean(result.ai_slip_config.has_gemini_key),
            gemini_key_masked: result.ai_slip_config.gemini_key_masked || '',
            gemini_api_key_input: '',
            max_slip_age_minutes: Number(result.ai_slip_config.max_slip_age_minutes) || 30,
            slipok_api_url: result.ai_slip_config.slipok_api_url || '',
            has_slipok_key: Boolean(result.ai_slip_config.has_slipok_key),
            slipok_key_masked: result.ai_slip_config.slipok_key_masked || '',
            slipok_api_key_input: '',
            admin_bypass_enabled: Boolean(result.ai_slip_config.admin_bypass_enabled),
            admin_bypass_emails_input: Array.isArray(result.ai_slip_config.admin_bypass_emails)
              ? result.ai_slip_config.admin_bypass_emails.join(', ')
              : prev.admin_bypass_emails_input,
          }))
        }
        setToast('✅ บันทึกการตั้งค่าเว็บไซต์และระบบ AI ตรวจสลิปสำเร็จ!')
        setTimeout(() => setToast(''), 4000)
      } else {
        alert('เกิดข้อผิดพลาด: ' + (result?.error || 'ไม่สามารถบันทึกได้'))
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
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">ตั้งค่าเว็บไซต์ & ระบบตรวจสลิปอัตโนมัติ</h1>

      {toast && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 rounded-xl text-center font-bold">
          {toast}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 👑👁️ แผงสลับโหมดแอดมินปลดล็อกทุกลิงก์ vs โหมดจำลองมุมมองลูกค้าจริง */}
        <div
          className={`bg-slate-900 border-2 rounded-2xl p-6 space-y-4 shadow-xl transition-colors ${
            aiConfig.admin_bypass_enabled
              ? 'border-amber-500/60'
              : 'border-cyan-500/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>👑👁️</span>
                  <span>โหมดแอดมินดูทุกลิงก์ vs โหมดจำลองมุมมองลูกค้าจริง</span>
                </h2>
                {aiConfig.admin_bypass_enabled ? (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    🟢 เปิดโหมดแอดมิน (เห็นทุกลิงก์โดยไม่ต้องซื้อ)
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    🔒 ปิดโหมดแอดมิน (จำลองมุมมองลูกค้าจริง 100%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                เมื่อ <strong>ปิดโหมดแอดมิน (🔒)</strong> เวลาคุณล็อกอินหน้าเว็บด้วยอีเมลตัวเอง ระบบจะแสดงผลเหมือนลูกค้าทั่วไป 100% (ซ่อนลิงก์ที่ยังไม่ได้ซื้อทั้งหมด) • เมื่อ <strong>เปิดโหมดแอดมิน (🟢)</strong> อีเมลของคุณจะปลดล็อกเข้าดูได้ทุกเครื่องมือและคอร์สเรียนครบทั้ง 23 บททันที
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={togglingBypass}
                onClick={() => handleQuickToggleBypass(!aiConfig.admin_bypass_enabled)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all shadow-md active:scale-95 ${
                  aiConfig.admin_bypass_enabled
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border-cyan-500/50'
                }`}
              >
                {togglingBypass
                  ? '⏳ กำลังสลับโหมด...'
                  : aiConfig.admin_bypass_enabled
                  ? '🟢 เปิดอยู่ (คลิกเพื่อสลับเป็นมุมมองลูกค้า 🔒)'
                  : '🔒 มุมมองลูกค้า (คลิกเพื่อปลดล็อกแอดมิน 🟢)'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-semibold text-slate-300">
              📧 รายชื่ออีเมลแอดมินที่ได้รับสิทธิ์เมื่อเปิดโหมดนี้ (คั่นด้วยลูกน้ำ ,)
            </label>
            <input
              type="text"
              value={aiConfig.admin_bypass_emails_input}
              onChange={e =>
                setAiConfig({ ...aiConfig, admin_bypass_emails_input: e.target.value })
              }
              placeholder="nilmat2007@gmail.com, nilmat200757@gmail.com"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-4 py-2 text-white text-xs sm:text-sm font-mono focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">
              💡 เฉพาะอีเมลที่ระบุในช่องนี้เท่านั้นที่จะเห็นทุกลิงก์เมื่อสวิตช์ด้านบนเป็น <strong>🟢 เปิดโหมดแอดมิน</strong> (ลูกค้าคนอื่นไม่มีผลใดๆ ทั้งสิ้น)
            </p>
          </div>
        </div>

        {/* 🤖 แผงควบคุมระบบ AI ตรวจสลิปและอนุมัติอัตโนมัติ 24 ชม. */}
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>🤖🛡️</span>
                  <span>ระบบ AI ตรวจสลิป & อนุมัติอัตโนมัติ 24 ชม. (7-Layer Anti-Fraud)</span>
                </h2>
                {aiConfig.ai_slip_enabled && aiConfig.has_gemini_key ? (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 พร้อมอนุมัติอัตโนมัติ 24 ชม.
                  </span>
                ) : aiConfig.ai_slip_enabled ? (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    🟡 รอใส่ Gemini API Key (ฟรี)
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    ⚪ ปิดอยู่ (แอดมินตรวจเองใน Telegram)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ตรวจสอบ QR ธนาคารแห่งประเทศไทย (CRC-16) + เช็กสลิปซ้ำ + ใช้ Gemini Vision ตรวจชื่อผู้รับ (<strong>นาย ภีมฑพัฒน์ นิลมาตย์ · พร้อมเพย์ 090-555-6356</strong>) ยอดเงิน และเวลาโอน ก่อนเปิดสิทธิ์ให้ลูกค้าอัตโนมัติตอนคุณหลับ
              </p>
            </div>

            <label className="inline-flex items-center gap-2.5 cursor-pointer shrink-0 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={aiConfig.ai_slip_enabled}
                onChange={e => setAiConfig({ ...aiConfig, ai_slip_enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span className="text-sm font-bold text-white">
                {aiConfig.ai_slip_enabled ? 'เปิดใช้ AI ตรวจสลิป' : 'ปิด AI (ตรวจเอง)'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gemini API Key Input */}
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-sm font-semibold text-emerald-400">
                  🔑 Google Gemini API Key (ฟรี 100%)
                </label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>✨ กดรับคีย์ฟรีที่ Google AI Studio</span>
                  <span>↗</span>
                </a>
              </div>
              <input
                type="password"
                value={aiConfig.gemini_api_key_input}
                onChange={e => setAiConfig({ ...aiConfig, gemini_api_key_input: e.target.value })}
                placeholder={
                  aiConfig.has_gemini_key
                    ? `ตั้งค่าคีย์ไว้แล้ว (${aiConfig.gemini_key_masked}) — พิมพ์ทับหากต้องการเปลี่ยนคีย์ใหม่`
                    : 'วางคีย์ AIzaSy... จาก Google AI Studio ที่นี่แล้วกดบันทึกด้านล่าง'
                }
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
              />
              <p className="text-xs text-slate-400">
                {aiConfig.has_gemini_key ? (
                  <span className="text-emerald-400 font-semibold">
                    ✓ เข้ารหัสเก็บคีย์ไว้แล้ว ({aiConfig.gemini_key_masked}) ระบบพร้อมตรวจสลิปและอนุมัติอัตโนมัติทันที
                  </span>
                ) : (
                  <span className="text-amber-300">
                    ⚠️ กรุณากดลิงก์ &quot;กดรับคีย์ฟรีที่ Google AI Studio&quot; ด้านบน แล้วคัดลอกคีย์มาวางช่องนี้เพื่อเปิดระบบ AI อ่านภาพสลิปครับ
                  </span>
                )}
              </p>
            </div>

            {/* Max Slip Age Minutes */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-300">
                ⏱️ อายุสลิปสูงสุดที่อนุญาต
              </label>
              <select
                value={aiConfig.max_slip_age_minutes}
                onChange={e =>
                  setAiConfig({ ...aiConfig, max_slip_age_minutes: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none"
              >
                <option value={15}>ไม่เกิน 15 นาที (เข้มงวดสูงสุด)</option>
                <option value={30}>ไม่เกิน 30 นาที (แนะนำ)</option>
                <option value={60}>ไม่เกิน 60 นาที (1 ชั่วโมง)</option>
                <option value={120}>ไม่เกิน 120 นาที (2 ชั่วโมง)</option>
              </select>
              <p className="text-xs text-slate-500">
                หากลูกค้าแนบสลิปเก่าที่โอนเกินเวลานี้ AI จะปฏิเสธและให้แนบสลิปใหม่ทันที
              </p>
            </div>
          </div>

          {/* Optional SlipOK Integration Toggle */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowAdvancedSlipOk(!showAdvancedSlipOk)}
              className="text-xs text-slate-400 hover:text-white font-semibold flex items-center gap-1.5"
            >
              <span>{showAdvancedSlipOk ? '▼' : '▶'}</span>
              <span>ตัวเลือกเสริมขั้นสูง: เชื่อมต่อ API ธนาคาร SlipOK (ไม่บังคับ — เว้นว่างไว้ได้)</span>
            </button>

            {showAdvancedSlipOk && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SlipOK API Endpoint URL</label>
                  <input
                    type="url"
                    value={aiConfig.slipok_api_url}
                    onChange={e => setAiConfig({ ...aiConfig, slipok_api_url: e.target.value })}
                    placeholder="https://api.slipok.com/api/line/apikey/XXXX"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SlipOK API Key (x-authorization)</label>
                  <input
                    type="password"
                    value={aiConfig.slipok_api_key_input}
                    onChange={e => setAiConfig({ ...aiConfig, slipok_api_key_input: e.target.value })}
                    placeholder={
                      aiConfig.has_slipok_key
                        ? `ตั้งค่าแล้ว (${aiConfig.slipok_key_masked})`
                        : 'SLIPOK_KEY...'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ตั้งค่าข้อมูลทั่วไปของเว็บไซต์ */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            🌐 ข้อมูลทั่วไปของเว็บไซต์
          </h2>

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
            <label className="block text-sm text-green-400 font-medium mb-1">📲 ลิงก์ LINE Official Account (สำหรับดึงคนจาก Facebook แชท)</label>
            <input 
              type="url" 
              placeholder="https://lin.ee/xxxxx หรือ https://line.me/R/ti/p/@xxxxx" 
              value={settings.line_oa_url || ''} 
              onChange={e => setSettings({...settings, line_oa_url: e.target.value})} 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-green-500 focus:outline-none" 
            />
            <p className="text-xs text-slate-500 mt-1">เมื่อตั้งค่าลิงก์นี้ บอท Facebook จะส่งปุ่มชวนลูกค้าแอด LINE เพื่อรับสิทธิ์โปรโมชั่นและสร้างฐานบรอดแคสต์ฟรี</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">🎨 โลโก้ (Logo URL)</label>
            <input type="file" ref={logoRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
            <div className="flex gap-4 items-center">
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm border border-slate-700 disabled:opacity-50">
                {uploading === 'logo' ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลดโลโก้'}
              </button>
              {settings.logo_url && (
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <img src={settings.logo_url} alt="Logo Preview" className="h-10 object-contain" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">🖼️ รูปภาพแชร์ (OG Image URL)</label>
            <input type="file" ref={ogRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'og')} />
            <div className="flex gap-4 items-center">
              <button type="button" onClick={() => ogRef.current?.click()} disabled={uploading === 'og'} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm border border-slate-700 disabled:opacity-50">
                {uploading === 'og' ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลดรูปแชร์'}
              </button>
              {settings.og_image_url && (
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <img src={settings.og_image_url} alt="OG Preview" className="h-10 w-20 object-cover" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">⭐ ไอคอนแท็บเบราว์เซอร์ (Favicon)</label>
            <input type="file" ref={faviconRef} accept="image/png,image/x-icon,image/svg+xml,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'favicon')} />
            <div className="flex gap-4 items-center">
              <button type="button" onClick={() => faviconRef.current?.click()} disabled={uploading === 'favicon'} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm border border-slate-700 disabled:opacity-50">
                {uploading === 'favicon' ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลด Favicon'}
              </button>
              {settings.favicon_url && (
                <div className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center gap-2">
                  <img src={settings.favicon_url} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                  <span className="text-xs text-slate-500">ตัวอย่าง</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">แนะนำ: รูป PNG ขนาด 32x32 หรือ 64x64 px</p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 px-8 py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity font-extrabold shadow-lg">
              {saving ? '⏳ กำลังบันทึกการตั้งค่า...' : '💾 บันทึกการตั้งค่าทั้งหมด'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
