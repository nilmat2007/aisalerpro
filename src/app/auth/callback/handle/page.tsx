'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function HandleCallback() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [status, setStatus] = useState('กำลังเข้าสู่ระบบ...')

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Try to get the session - the browser client automatically handles
        // hash fragments (#access_token=...) from implicit/PKCE flows
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth error:', error.message)
          setStatus('เกิดข้อผิดพลาด กำลังลองใหม่...')
        }

        if (session) {
          setStatus('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...')
          // Small delay to ensure cookies are set
          await new Promise(resolve => setTimeout(resolve, 500))
          router.push(next)
          router.refresh()
          return
        }

        // If no session yet, wait a moment and check again 
        // (tokens might still be processing from the hash)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        if (retrySession) {
          setStatus('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...')
          await new Promise(resolve => setTimeout(resolve, 500))
          router.push(next)
          router.refresh()
          return
        }

        // Still no session - redirect to login
        setStatus('ไม่สามารถเข้าสู่ระบบได้ กำลังกลับหน้าล็อกอิน...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        router.push('/login?error=no-session')
      } catch (err) {
        console.error('Auth callback error:', err)
        router.push('/login?error=callback-error')
      }
    }

    handleAuth()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-white text-lg">{status}</p>
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
