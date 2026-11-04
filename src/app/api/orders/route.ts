import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  notifyNewOrder,
  notifyAiAutoApprovedOrder,
  notifyAiAutoRejectedOrder,
} from '@/lib/telegram';
import { verifySlipAndDecide } from '@/lib/slip-verifier';
import { sendEmail, buildOrderApprovedEmail } from '@/lib/email';
import { sendMetaCapiEvent } from '@/lib/meta-capi';

function generateLicenseKeyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let keyStr = 'PHM-';
  for (let i = 0; i < 4; i++) keyStr += chars.charAt(Math.floor(Math.random() * chars.length));
  keyStr += '-';
  for (let i = 0; i < 4; i++) keyStr += chars.charAt(Math.floor(Math.random() * chars.length));
  return keyStr;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    const body = await request.json();
    const { toolId, amount, slipUrl, slipBase64, slipMimeType, qrPayload } = body;

    if (!toolId) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลรายการที่สั่งซื้อ' }, { status: 400 });
    }

    // 1. ดึงข้อมูลสินค้าและตรวจสอบสิทธิ์ที่มีอยู่แล้วพร้อมกัน
    const [{ data: existingAccess }, { data: toolInfo }, { data: existingOrderRow }] =
      await Promise.all([
        supabaseAdmin
          .from('user_tools')
          .select('id')
          .eq('user_id', user.id)
          .eq('tool_id', toolId)
          .eq('is_active', true)
          .maybeSingle(),
        supabaseAdmin
          .from('tools')
          .select('id, name, slug, price, is_active, is_coming_soon')
          .eq('id', toolId)
          .single(),
        supabaseAdmin
          .from('orders')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('tool_id', toolId)
          .in('status', ['pending', 'rejected'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (
      !toolInfo ||
      !toolInfo.is_active ||
      (toolInfo.is_coming_soon && toolInfo.slug !== 'tiktok-ai-affiliate')
    ) {
      return NextResponse.json(
        { error: 'รายการนี้ปิดจำหน่ายชั่วคราว ไม่สามารถสั่งซื้อได้ในขณะนี้ครับ' },
        { status: 400 }
      );
    }

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
    let finalSlipUrl =
      slipUrl && slipUrl !== 'upload-failed' && slipUrl.startsWith('http') ? slipUrl : '';

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

    // 3. ใช้ราคาจริงจากฐานข้อมูล tools เพื่อป้องกันการแก้ไขตัวเลขจากฝั่ง Client
    const dbPriceNumeric =
      parseFloat(String(toolInfo?.price || '').replace(/[^0-9.]/g, '')) || 0;
    const clientPriceNumeric = parseFloat(String(amount || '0').replace(/[^0-9.]/g, '')) || 0;
    const expectedAmount = dbPriceNumeric > 0 ? dbPriceNumeric : clientPriceNumeric;

    // 4. เรียกใช้ระบบ AI + Anti-Fraud 7 ชั้นตรวจสอบสลิป
    const verification = await verifySlipAndDecide({
      supabaseAdmin,
      userId: user.id,
      toolId,
      expectedAmount,
      slipBase64,
      slipMimeType,
      slipUrl: finalSlipUrl,
      qrPayload,
      excludeOrderId: existingOrderRow?.id,
    });

    const customerName =
      user.user_metadata?.full_name || user.email?.split('@')[0] || 'ไม่ทราบชื่อ';
    const toolName = toolInfo?.name || 'เครื่องมือ AI';
    const nowIso = new Date().toISOString();

    // ─── CASE A: AI ตรวจสอบสลิปผ่าน 100% -> อนุมัติและปลดล็อกสิทธิ์ทันที ───
    if (verification.decision === 'approved') {
      const keyCode = generateLicenseKeyCode();
      const { data: createdKey } = await supabaseAdmin
        .from('license_keys')
        .insert({
          tool_id: toolId,
          key_code: keyCode,
          status: 'activated',
          activated_at: nowIso,
          activated_by: user.id,
          activated_email: user.email || '',
          note: `AI Auto-Approved (${verification.extracted?.transRef || ''})`,
        })
        .select('id, key_code')
        .maybeSingle();

      await supabaseAdmin.from('user_tools').upsert(
        {
          user_id: user.id,
          tool_id: toolId,
          license_key_id: createdKey?.id || null,
          is_active: true,
          activated_at: nowIso,
        },
        { onConflict: 'user_id,tool_id' }
      );

      const approvedPayload = {
        user_id: user.id,
        user_email: user.email || '',
        tool_id: toolId,
        amount: expectedAmount,
        slip_url: finalSlipUrl,
        status: 'approved',
        approved_at: nowIso,
        approved_by: 'AI_AUTO_VERIFIER',
        license_key_id: createdKey?.id || null,
        admin_note: `${verification.fingerprintTag} ${verification.reason}`,
      };

      let orderData: any = null;
      if (existingOrderRow?.id) {
        const { data: updated } = await supabaseAdmin
          .from('orders')
          .update(approvedPayload)
          .eq('id', existingOrderRow.id)
          .select()
          .single();
        orderData = updated;
      } else {
        const { data: inserted } = await supabaseAdmin
          .from('orders')
          .insert(approvedPayload)
          .select()
          .single();
        orderData = inserted;
      }

      // ยิง Meta CAPI แบบ non-blocking (fire-and-forget ไม่ทำให้ response ลูกค้าช้า)
      const approvedOrderId = String(orderData?.id || existingOrderRow?.id || Date.now());
      sendMetaCapiEvent({
        eventName: 'Purchase',
        eventId: `order_${approvedOrderId}`,
        orderId: approvedOrderId,
        value: expectedAmount || 299,
        req: request,
        email: user.email || '',
        contentId: toolInfo?.slug || 'tiktok-ai-affiliate',
      }).catch((err) => console.error('[CAPI] Auto-approve Purchase error:', err));

      // ส่งแจ้งเตือน Telegram แอดมิน + ส่งอีเมลให้ลูกค้าพร้อมกัน
      const tasks: Promise<any>[] = [
        notifyAiAutoApprovedOrder(
          customerName,
          user.email || '',
          toolName,
          `${expectedAmount.toLocaleString()} บาท`,
          finalSlipUrl,
          verification.reason
        ),
      ];

      if (user.email && user.email.includes('@')) {
        const emailHtml = buildOrderApprovedEmail({
          customerName,
          toolName,
          toolSlug: toolInfo?.slug || '',
          keyCode: createdKey?.key_code || keyCode,
          amount: `${expectedAmount.toLocaleString()} บาท`,
        });
        tasks.push(
          sendEmail({
            to: user.email,
            subject: `✅ คำสั่งซื้อ ${toolName} ของคุณได้รับการอนุมัติแล้ว — PUP PAP AI`,
            html: emailHtml,
          }).catch((e) => console.error('Auto-approve email error:', e))
        );
      }

      await Promise.all(tasks);

      return NextResponse.json({
        ...orderData,
        status: 'approved',
        ai_verified: true,
        ai_reason: verification.reason,
      });
    }

    // ─── CASE B: AI ตรวจพบว่าสลิปไม่ถูกต้อง -> ปฏิเสธทันทีและให้ลูกค้าแนบสลิปใหม่ ───
    if (verification.decision === 'rejected') {
      const rejectedPayload = {
        user_id: user.id,
        user_email: user.email || '',
        tool_id: toolId,
        amount: expectedAmount,
        slip_url: finalSlipUrl,
        status: 'rejected',
        admin_note: `${verification.reason} ${verification.fingerprintTag}`,
        created_at: nowIso,
      };

      let orderData: any = null;
      if (existingOrderRow?.id) {
        const { data: updated } = await supabaseAdmin
          .from('orders')
          .update(rejectedPayload)
          .eq('id', existingOrderRow.id)
          .select()
          .single();
        orderData = updated;
      } else {
        const { data: inserted } = await supabaseAdmin
          .from('orders')
          .insert(rejectedPayload)
          .select()
          .single();
        orderData = inserted;
      }

      await notifyAiAutoRejectedOrder(
        customerName,
        user.email || '',
        toolName,
        `${expectedAmount.toLocaleString()} บาท`,
        orderData?.id || '',
        finalSlipUrl,
        verification.reason
      );

      return NextResponse.json({
        ...orderData,
        status: 'rejected',
        ai_rejected: true,
        rejection_reason: verification.reason,
      });
    }

    // ─── CASE C: รอแอดมินตรวจสอบใน Telegram (กรณีปิดโหมด AI หรือยังไม่ได้ใส่คีย์ Gemini) ───
    const pendingPayload = {
      user_id: user.id,
      user_email: user.email || '',
      tool_id: toolId,
      amount: expectedAmount,
      slip_url: finalSlipUrl,
      status: 'pending',
      admin_note: `${verification.fingerprintTag} ${verification.reason}`,
      created_at: nowIso,
    };

    let orderData: any = null;
    if (existingOrderRow?.id) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('orders')
        .update(pendingPayload)
        .eq('id', existingOrderRow.id)
        .select()
        .single();
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      orderData = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('orders')
        .insert(pendingPayload)
        .select()
        .single();
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      orderData = inserted;
    }

    await notifyNewOrder(
      customerName,
      user.email || '',
      toolName,
      `${expectedAmount.toLocaleString()} บาท`,
      orderData.id,
      finalSlipUrl
    );

    return NextResponse.json({
      ...orderData,
      status: 'pending',
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      // Strip internal [AI-...] fingerprint tags when showing admin_note to the customer
      const cleanAdminNote = latestOrder?.admin_note
        ? String(latestOrder.admin_note).replace(/\[[A-Z0-9_-]+[^\]]*\]/g, '').trim()
        : '';

      return NextResponse.json({
        hasAccess,
        latestOrder: latestOrder
          ? {
              ...latestOrder,
              admin_note: cleanAdminNote,
            }
          : null,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, user_email, tool_id, package_type, amount, slip_url, status, admin_note, license_key_id, created_at, approved_at, tools(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
