'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const code = searchParams.get('code')
  const [status, setStatus] = useState('กำลังเข้าสู่ระบบ...')
  const [debug, setDebug] = useState('')

  useEffect(() => {
    let redirected = false

    const doRedirect = () => {
      if (redirected) return
      redirected = true
      setStatus('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...')
      // Full page reload to ensure server picks up cookies
      window.location.href = next
    }

    // Method 1: Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setDebug(prev => prev + `\nEvent: ${event}, hasSession: ${!!session}`)
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        doRedirect()
      }
    })

    // Method 2: If there's a code parameter, exchange it
    if (code) {
      setDebug(prev => prev + `\nFound code parameter, exchanging...`)
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          setDebug(prev => prev + `\nCode exchange error: ${error.message}`)
        } else if (data.session) {
          setDebug(prev => prev + `\nCode exchange success!`)
          doRedirect()
        }
      })
    }

    // Method 3: Check hash fragment manually
    if (typeof window !== 'undefined' && window.location.hash) {
      setDebug(prev => prev + `\nHash detected: ${window.location.hash.substring(0, 50)}...`)
    }

    // Method 4: Check if already has session (e.g., from hash auto-detection)
    const checkSession = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (redirected) return
      
      const { data: { session } } = await supabase.auth.getSession()
      setDebug(prev => prev + `\nSession check after 2s: ${!!session}`)
      if (session) {
        doRedirect()
        return
      }

      // Final check after 6 seconds
      await new Promise(resolve => setTimeout(resolve, 4000))
      if (redirected) return

      const { data: { session: finalSession } } = await supabase.auth.getSession()
      setDebug(prev => prev + `\nFinal session check: ${!!finalSession}`)
      if (finalSession) {
        doRedirect()
      } else {
        setStatus('ไม่สามารถเข้าสู่ระบบได้')
        // Don't auto-redirect to login, show debug info instead
      }
    }
    
    checkSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-white text-lg mb-2">{status}</p>
      <p className="text-slate-500 text-sm">กรุณารอสักครู่...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-white text-lg">กำลังเข้าสู่ระบบ...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
