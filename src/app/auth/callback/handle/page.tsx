'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function HandleCallback() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [status, setStatus] = useState('กำลังเข้าสู่ระบบ...')

  useEffect(() => {
    // Listen for auth state changes - this fires AFTER the browser client
    // processes hash fragment tokens or PKCE codes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...')
        // Use window.location for a full page reload to ensure server picks up new cookies
        window.location.href = next
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        setStatus('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...')
        window.location.href = next
      }
    })

    // Fallback: if no auth event fires within 8 seconds, redirect to login
    const timeout = setTimeout(() => {
      // One last check before giving up
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          window.location.href = next
        } else {
          setStatus('ไม่สามารถเข้าสู่ระบบได้ กำลังกลับหน้าล็อกอิน...')
          setTimeout(() => {
            window.location.href = '/login?error=timeout'
          }, 1500)
        }
      })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-white text-lg">{status}</p>
      <p className="text-slate-500 text-sm mt-2">กรุณารอสักครู่...</p>
    </div>
  )
}

export default function HandleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-white text-lg">กำลังเข้าสู่ระบบ...</p>
      </div>
    }>
      <HandleCallback />
    </Suspense>
  )
}
