import { createClient } from '@/lib/supabase/server';
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
  try {
    const { id } = await props.params;
    const { action, note } = await request.json();
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
      
    if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'pending') return NextResponse.json({ error: 'Order is not pending' }, { status: 400 });

    if (action === 'approve') {
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
        .select()
        .single();
        
      if (keyError) throw keyError;

      // 2. Auto-activate for user
      const { error: userToolError } = await supabase
        .from('user_tools')
        .insert({
          user_id: order.user_id,
          tool_id: order.tool_id,
          license_key_id: newKey.id
        });
        
      if (userToolError) {
        console.error('Auto-activate failed:', userToolError);
        // Continue anyway to mark order approved
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

      // แจ้ง Telegram
      const { data: toolInfo } = await supabase.from('tools').select('name, slug, price').eq('id', order.tool_id).single()
      notifyOrderApproved(order.user_email, toolInfo?.name || 'ไม่ระบุ')

      // ส่งอีเมลแจ้งเตือนลูกค้าว่าได้รับการอนุมัติเรียบร้อยแล้ว
      if (order.user_email && order.user_email.includes('@')) {
        const emailHtml = buildOrderApprovedEmail({
          customerName: order.user_email.split('@')[0],
          toolName: toolInfo?.name || 'เครื่องมือ AI',
          toolSlug: toolInfo?.slug || '',
          keyCode,
          amount: order.amount || toolInfo?.price || '',
        })
        sendEmail({
          to: order.user_email,
          subject: `✅ คำสั่งซื้อ ${toolInfo?.name || 'เครื่องมือ AI'} ของคุณได้รับการอนุมัติแล้ว — PUP PAP AI`,
          html: emailHtml,
        }).catch(err => console.error('Failed to send order approved email:', err))
      }

      return NextResponse.json({ success: true, keyCode });

    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'rejected',
          admin_note: note
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // ส่งอีเมลแจ้งเตือนลูกค้ากรณีปฏิเสธ
      if (order.user_email && order.user_email.includes('@')) {
        const { data: toolInfo } = await supabase.from('tools').select('name, slug').eq('id', order.tool_id).single()
        const emailHtml = buildOrderRejectedEmail({
          customerName: order.user_email.split('@')[0],
          toolName: toolInfo?.name || 'เครื่องมือ AI',
          toolSlug: toolInfo?.slug || '',
          note,
        })
        sendEmail({
          to: order.user_email,
          subject: `⚠️ แจ้งเตือนเกี่ยวกับคำสั่งซื้อ ${toolInfo?.name || 'เครื่องมือ AI'} — PUP PAP AI`,
          html: emailHtml,
        }).catch(err => console.error('Failed to send order rejected email:', err))
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
