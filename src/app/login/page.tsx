'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  useEffect(() => {
    supabase.from('site_settings').select('*').single()
      .then(({ data }) => {
        if (data) setSettings(data)
      })
  }, [])

  const handleLogin = async () => {
    setIsLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col items-center justify-center p-4 transition-colors duration-200">
      
      {/* Top right theme toggle */}
      <div className="fixed top-5 right-5 z-20">
        <ThemeToggle size="md" />
      </div>

      <div className="w-full max-w-md puppap-card p-8 flex flex-col items-center text-center relative">
        <div className="relative w-24 h-24 mb-4">
          <Image
            src={settings?.logo_url || "/images/logo-puppap-ai.png"}
            alt="Logo"
            fill
            className="rounded-2xl border-[1.5px] border-[var(--border)] object-cover shadow-sm bg-white"
          />
        </div>

        <div className="puppap-badge-pro mb-3">
          PRO · LIFETIME · คิดปุ๊บ คลิปปั๊บ 🔄
        </div>
        
        <h1 className="text-2xl font-black text-[var(--text-primary)] mb-1 tracking-tight">
          {settings?.site_name || 'PUP PAP AI'}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">เข้าสู่ระบบเพื่อใช้งานเครื่องมือสร้างคลิป AI</p>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] border-[1.5px] border-[var(--border)] font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 hover:bg-[var(--bg-hover)] transition-all shadow-sm active:scale-95 disabled:opacity-70"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
        </button>
        
        <p className="text-xs text-[var(--text-muted)] mt-4 mb-4">
          กดปุ่มด้านบนเพื่อเข้าสู่ระบบ ไม่ต้องสมัครสมาชิก!
        </p>

        <div className="w-full h-px bg-[var(--border-light)] my-3"></div>

        <Link href="/store" className="text-[var(--accent)] hover:underline transition-colors text-sm font-bold">
          ดูรายละเอียดเครื่องมือ &rarr;
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center p-4"><div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div></div>}>
      <LoginContent />
    </Suspense>
  )
}
