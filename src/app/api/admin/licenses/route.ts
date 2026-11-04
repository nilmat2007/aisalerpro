import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from('license_keys')
    .select('id, key_code, tool_id, package_type, status, activated_by, activated_email, activated_at, note, created_at, created_by, tools(name, slug)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keys: data })
}

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let part1 = ''
  let part2 = ''
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length))
    part2 += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `PHM-${part1}-${part2}`
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { toolId, packageType, note, quantity = 1 } = await request.json()

  const keysToInsert = []
  for (let i = 0; i < quantity; i++) {
    keysToInsert.push({
      key_code: generateKey(),
      tool_id: toolId === 'all' ? null : toolId,
      package_type: packageType,
      note: note,
      status: 'unused',
    })
  }

  const { data, error } = await supabase
    .from('license_keys')
    .insert(keysToInsert)
    .select('id, key_code, tool_id, package_type, status, activated_by, activated_email, activated_at, note, created_at, created_by')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keys: data })
}
