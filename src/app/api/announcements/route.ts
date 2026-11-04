import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, content, tool_id, badge_text, badge_color, status, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) return NextResponse.json([])
  return NextResponse.json(data || [])
}
