import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/require-admin'

async function revokeLinkedAccess(keyId: string) {
  const { data: keyInfo } = await supabase
    .from('license_keys')
    .select('id, tool_id, activated_by, activated_email')
    .eq('id', keyId)
    .maybeSingle()

  if (!keyInfo) return

  // 1. Delete user_tools linked by license_key_id or (user_id + tool_id)
  await supabase.from('user_tools').delete().eq('license_key_id', keyId)

  if (keyInfo.activated_by && keyInfo.tool_id) {
    await supabase
      .from('user_tools')
      .delete()
      .eq('user_id', keyInfo.activated_by)
      .eq('tool_id', keyInfo.tool_id)
  }

  // 2. Also find profile by email if activated_by was null
  if (keyInfo.activated_email && keyInfo.tool_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', keyInfo.activated_email)
      .maybeSingle()

    if (profile?.id) {
      await supabase
        .from('user_tools')
        .delete()
        .eq('user_id', profile.id)
        .eq('tool_id', keyInfo.tool_id)
    }
  }

  // 3. Reject any approved orders linked to this key/user/email so Auto-Heal never resurrects access
  const revokeNote = 'แอดมินยกเลิกสิทธิ์ผ่านหน้าจัดการ License Key (Revoked)'
  await supabase
    .from('orders')
    .update({ status: 'rejected', admin_note: revokeNote })
    .eq('license_key_id', keyId)
    .eq('status', 'approved')

  if (keyInfo.activated_by && keyInfo.tool_id) {
    await supabase
      .from('orders')
      .update({ status: 'rejected', admin_note: revokeNote })
      .eq('user_id', keyInfo.activated_by)
      .eq('tool_id', keyInfo.tool_id)
      .eq('status', 'approved')
  }

  if (keyInfo.activated_email && keyInfo.tool_id) {
    await supabase
      .from('orders')
      .update({ status: 'rejected', admin_note: revokeNote })
      .ilike('user_email', keyInfo.activated_email)
      .eq('tool_id', keyInfo.tool_id)
      .eq('status', 'approved')
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const params = await props.params
  const { status } = await request.json()

  if (status === 'revoked') {
    await revokeLinkedAccess(params.id)
  }

  const { data, error } = await supabase
    .from('license_keys')
    .update({ status })
    .eq('id', params.id)
    .select('id, key_code, tool_id, package_type, status, activated_by, activated_email, activated_at, note, created_at, created_by')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ key: data?.[0] })
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const params = await props.params

  await revokeLinkedAccess(params.id)

  const { error } = await supabase
    .from('license_keys')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
