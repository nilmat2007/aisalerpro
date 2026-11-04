import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function getJwtSecretKey(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET
  if (!raw || raw.length < 32) throw new Error('ADMIN_JWT_SECRET missing or too short')
  return new TextEncoder().encode(raw)
}

async function verifyAdminCookie(token: string | undefined): Promise<{
  authenticated: boolean
  isAdmin: boolean
}> {
  if (!token) {
    return { authenticated: false, isAdmin: false }
  }
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    const isAdmin =
      typeof payload.is_admin === 'boolean'
        ? payload.is_admin
        : payload.role === 'admin'
    return { authenticated: true, isAdmin }
  } catch {
    return { authenticated: false, isAdmin: false }
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Defense-in-depth for /api/admin/:path* and /api/debug-auth
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/debug-auth')) {
    const adminToken = request.cookies.get('admin_token')?.value
    const { authenticated, isAdmin } = await verifyAdminCookie(adminToken)

    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.next()
  }

  // 2. Defense-in-depth for /admin/:path* (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const adminToken = request.cookies.get('admin_token')?.value
    const { authenticated, isAdmin } = await verifyAdminCookie(adminToken)

    if (!authenticated || !isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // 3. Refresh Supabase session for non-admin routes when configured
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    await supabase.auth.getUser()
  }

  return response
}

export { proxy as middleware }

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
