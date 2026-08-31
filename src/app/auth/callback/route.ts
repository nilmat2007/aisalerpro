import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // PKCE flow: exchange code for session
    const redirectUrl = new URL(next, origin)
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
    // If code exchange fails, fall through to error
    console.error('Auth callback code exchange failed:', error.message)
  }

  // Check for hash-based tokens (implicit/PKCE flow)
  // Hash fragments aren't sent to the server, so we need client-side handling
  // Redirect to a client-side handler page
  const clientHandlerUrl = new URL('/auth/callback/handle', origin)
  clientHandlerUrl.searchParams.set('next', next)
  // Pass along any error info
  if (!code) {
    // No code param means tokens might be in the hash fragment
    // Let client-side handle it
    return NextResponse.redirect(clientHandlerUrl)
  }

  return NextResponse.redirect(new URL('/login?error=auth-code-error', origin))
}
