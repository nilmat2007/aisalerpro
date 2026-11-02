import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { notifyNewOrder } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    const body = await request.json();
    const { toolId, amount, slipUrl, slipBase64, slipMimeType } = body;

    if (!toolId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายการที่สั่งซื้อ' }, { status: 400 });
    }

    // 1. ป้องกันการสั่งซื้อซ้ำหากมีสิทธิ์ใช้งานเครื่องมือนี้อยู่แล้ว
    const { data: existingAccess } = await supabaseAdmin
      .from('user_tools')
      .select('id')
      .eq('user_id', user.id)
      .eq('tool_id', toolId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingAccess) {
      return NextResponse.json(
        {
          error: 'คุณมีสิทธิ์ใช้งานรายการนี้อยู่แล้ว ไม่จำเป็นต้องชำระเงินหรือส่งสลิปซ้ำครับ',
          alreadyOwned: true,
        },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบรูปสลิป หรืออัปโหลดผ่าน Server Fallback หากฝั่ง Client อัปโหลดไม่ผ่าน
    let finalSlipUrl = (slipUrl && slipUrl !== 'upload-failed' && slipUrl.startsWith('http')) ? slipUrl : '';

    if (!finalSlipUrl && slipBase64) {
      try {
        const base64Data = String(slipBase64).replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const mime = slipMimeType || 'image/jpeg';
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const safeFileName = `${user.id}_${Date.now()}.${ext}`;

        const { error: adminUploadErr } = await supabaseAdmin.storage
          .from('slips')
          .upload(safeFileName, buffer, {
            contentType: mime,
            upsert: true,
          });

        if (!adminUploadErr) {
          const { data: pubData } = supabaseAdmin.storage.from('slips').getPublicUrl(safeFileName);
          finalSlipUrl = pubData?.publicUrl || '';
        } else {
          console.error('Server fallback slip upload error:', adminUploadErr);
        }
      } catch (e) {
        console.error('Base64 decode/upload error:', e);
      }
    }

    if (!finalSlipUrl) {
      return NextResponse.json(
        { error: 'อัปโหลดรูปสลิปไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดส่งสลิปใหม่อีกครั้งครับ' },
        { status: 400 }
      );
    }

    // 3. แปลง amount ให้เป็นตัวเลข
    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;

    // 4. เช็กว่ามีออเดอร์ pending ของรายการนี้ค้างอยู่หรือไม่ (ป้องกันการกดส่งสลิปซ้ำซ้อนหลายแถว)
    const { data: existingPending } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('tool_id', toolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let orderData: any = null;

    if (existingPending) {
      const { data: updatedOrder, error: updateErr } = await supabaseAdmin
        .from('orders')
        .update({
          amount: numericAmount,
          slip_url: finalSlipUrl,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingPending.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      orderData = updatedOrder;
    } else {
      const { data: insertedOrder, error: insertErr } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          tool_id: toolId,
          amount: numericAmount,
          slip_url: finalSlipUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Order insert error:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      orderData = insertedOrder;
    }

    // 5. ดึงชื่อ tool และแจ้งเตือนเข้า Telegram พร้อมรูปสลิป (ต้อง await เสมอบน Vercel Serverless)
    const { data: toolInfo } = await supabaseAdmin
      .from('tools')
      .select('name')
      .eq('id', toolId)
      .single();

    await notifyNewOrder(
      user.user_metadata?.full_name || user.email || 'ไม่ทราบชื่อ',
      user.email || '',
      toolInfo?.name || 'ไม่ระบุ',
      `${numericAmount.toLocaleString()} บาท`,
      orderData.id,
      finalSlipUrl
    );

    return NextResponse.json(orderData);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');

    if (toolId) {
      const [{ data: userTool }, { data: latestOrder }] = await Promise.all([
        supabaseAdmin
          .from('user_tools')
          .select('id')
          .eq('user_id', user.id)
          .eq('tool_id', toolId)
          .eq('is_active', true)
          .maybeSingle(),
        supabaseAdmin
          .from('orders')
          .select('id, status, slip_url, admin_note, created_at, approved_at')
          .eq('user_id', user.id)
          .eq('tool_id', toolId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const hasAccess = Boolean(userTool) || latestOrder?.status === 'approved';
      return NextResponse.json({
        hasAccess,
        latestOrder: latestOrder || null,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, tools(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
