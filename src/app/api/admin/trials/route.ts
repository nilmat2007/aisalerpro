import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - ดึงข้อมูล trial ทั้งหมดสำหรับ CRM
export async function GET() {
  try {
    const { data: trials, error } = await supabase
      .from('user_trials')
      .select('*, tools(name, slug, price)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(trials || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
