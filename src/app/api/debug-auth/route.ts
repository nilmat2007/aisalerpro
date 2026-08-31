import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Create supabase with request cookies (same as proxy)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // List all cookies (names only, not values for security)
  const cookieNames = request.cookies.getAll().map(c => c.name)
  const authCookies = cookieNames.filter(n => n.includes('auth') || n.includes('sb-'))

  return NextResponse.json({
    hasUser: !!user,
    userId: user?.id || null,
    userEmail: user?.email || null,
    error: error?.message || null,
    totalCookies: cookieNames.length,
    authCookies,
    allCookieNames: cookieNames,
    timestamp: new Date().toISOString(),
  })
}
