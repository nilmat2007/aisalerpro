import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth/require-admin';
import { NextResponse } from 'next/server';
import { notifyOrderApproved } from '@/lib/telegram';
import { sendEmail, buildOrderApprovedEmail, buildOrderRejectedEmail } from '@/lib/email';

function generateLicenseCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'PHM-';
  for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  result += '-';
  for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await props.params;
    const { action, note } = await request.json();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, user_email, tool_id, package_type, amount, slip_url, status, admin_note, license_key_id, created_at, approved_at, approved_by')
      .eq('id', id)
      .single();
      
    if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (action === 'approve') {
      if (order.status !== 'pending') {
        return NextResponse.json({ error: 'Order is not pending' }, { status: 400 });
      }
      const keyCode = generateLicenseCode();
      
      // 1. Create license key
      const { data: newKey, error: keyError } = await supabase
        .from('license_keys')
        .insert({
          tool_id: order.tool_id,
          key_code: keyCode,
          status: 'activated',
          activated_at: new Date().toISOString(),
          activated_by: order.user_id,
          activated_email: order.user_email
        })
        .select('id, key_code')
        .single();
        
      if (keyError) throw keyError;

      // 2. Auto-activate for user (Upsert to guarantee idempotency)
      const { error: userToolError } = await supabase
        .from('user_tools')
        .upsert(
          {
            user_id: order.user_id,
            tool_id: order.tool_id,
            license_key_id: newKey.id,
            is_active: true,
            activated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,tool_id' }
        );
        
      if (userToolError) {
        console.error('Auto-activate failed:', userToolError);
      }

      // 3. Update order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          license_key_id: newKey.id
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // แจ้ง Telegram (awaited)
      const { data: toolInfo } = await supabase.from('tools').select('name, slug, price').eq('id', order.tool_id).single();
      await notifyOrderApproved(order.user_email, toolInfo?.name || 'ไม่ระบุ');

      // ส่งอีเมลแจ้งเตือนลูกค้าว่าได้รับการอนุมัติเรียบร้อยแล้ว (awaited)
      if (order.user_email && order.user_email.includes('@')) {
        const emailHtml = buildOrderApprovedEmail({
          customerName: order.user_email.split('@')[0],
          toolName: toolInfo?.name || 'เครื่องมือ AI',
          toolSlug: toolInfo?.slug || '',
          keyCode,
          amount: order.amount || toolInfo?.price || '',
        });
        await sendEmail({
          to: order.user_email,
          subject: `✅ คำสั่งซื้อ ${toolInfo?.name || 'เครื่องมือ AI'} ของคุณได้รับการอนุมัติแล้ว — PUP PAP AI`,
          html: emailHtml,
        }).catch(err => console.error('Failed to send order approved email:', err));
      }

      return NextResponse.json({ success: true, keyCode });

    } else if (action === 'reject' || action === 'revoke') {
      const finalNote = note || 'แอดมินยกเลิกสิทธิ์การใช้งาน (Revoked)';

      // 1. Delete user_tools access for this user + tool
      if (order.user_id && order.tool_id) {
        await supabase
          .from('user_tools')
          .delete()
          .eq('user_id', order.user_id)
          .eq('tool_id', order.tool_id);
      }
      if (order.license_key_id) {
        await supabase
          .from('user_tools')
          .delete()
          .eq('license_key_id', order.license_key_id);
      }

      // 2. Revoke any linked license_keys
      if (order.license_key_id) {
        await supabase
          .from('license_keys')
          .update({ status: 'revoked' })
          .eq('id', order.license_key_id);
      }
      if (order.user_id && order.tool_id) {
        await supabase
          .from('license_keys')
          .update({ status: 'revoked' })
          .eq('tool_id', order.tool_id)
          .eq('activated_by', order.user_id)
          .eq('status', 'activated');
      }
      if (order.user_email && order.tool_id) {
        await supabase
          .from('license_keys')
          .update({ status: 'revoked' })
          .eq('tool_id', order.tool_id)
          .ilike('activated_email', order.user_email)
          .eq('status', 'activated');
      }

      // 3. Update order status to rejected
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'rejected',
          admin_note: finalNote
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Also mark any other approved orders for the same user+tool as rejected so Auto-Heal never resurrects access
      if (order.user_id && order.tool_id) {
        await supabase
          .from('orders')
          .update({ status: 'rejected', admin_note: finalNote })
          .eq('user_id', order.user_id)
          .eq('tool_id', order.tool_id)
          .eq('status', 'approved');
      }
      if (order.user_email && order.tool_id) {
        await supabase
          .from('orders')
          .update({ status: 'rejected', admin_note: finalNote })
          .ilike('user_email', order.user_email)
          .eq('tool_id', order.tool_id)
          .eq('status', 'approved');
      }

      // ส่งอีเมลแจ้งเตือนลูกค้ากรณีปฏิเสธ (awaited)
      if (order.user_email && order.user_email.includes('@')) {
        const { data: toolInfo } = await supabase.from('tools').select('name, slug').eq('id', order.tool_id).single();
        const emailHtml = buildOrderRejectedEmail({
          customerName: order.user_email.split('@')[0],
          toolName: toolInfo?.name || 'เครื่องมือ AI',
          toolSlug: toolInfo?.slug || '',
          note: finalNote,
        });
        await sendEmail({
          to: order.user_email,
          subject: `⚠️ แจ้งเตือนเกี่ยวกับคำสั่งซื้อ ${toolInfo?.name || 'เครื่องมือ AI'} — PUP PAP AI`,
          html: emailHtml,
        }).catch(err => console.error('Failed to send order rejected email:', err));
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
