import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: memberId } = await params
    const { user_tool_id } = await request.json()

    if (!user_tool_id) {
      return NextResponse.json({ error: 'ไม่ระบุ user_tool_id' }, { status: 400 })
    }

    // ลบ user_tools record
    const { error } = await supabase
      .from('user_tools')
      .delete()
      .eq('id', user_tool_id)
      .eq('user_id', memberId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
