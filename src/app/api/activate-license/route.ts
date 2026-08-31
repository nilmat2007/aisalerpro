import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { keyCode } = await request.json()
    if (!keyCode) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสปลดล็อก' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 })
    }

    // Ensure profile exists (in case trigger didn't fire)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Auto-create profile
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      })
    }

    const { data, error } = await supabase.rpc('activate_license', {
      p_key_code: keyCode,
      p_user_id: user.id
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // The RPC returns a JSONB object with its own success/error fields
    // Pass them through directly
    if (data && typeof data === 'object') {
      return NextResponse.json(data)
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
