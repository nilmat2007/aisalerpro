import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  notifyNewOrder,
  notifyAiAutoApprovedOrder,
  notifyAiAutoRejectedOrder,
  notifyBundleGrantFailure,
} from '@/lib/telegram';
import { verifySlipAndDecide } from '@/lib/slip-verifier';
import { sendEmail, buildOrderApprovedEmail } from '@/lib/email';
import { sendMetaCapiEvent } from '@/lib/meta-capi';
import {
  approveOrderAndGrantBundle,
  BUNDLE_ERROR_CATALOG,
  COURSE_BUNDLE_SLUGS,
  extractRequestId,
  formatSharedKeyRevokeMessage,
  isCourseBundleSlug,
} from '@/lib/course-bundle';

export async function POST(request: Request) {
  const requestId = extractRequestId(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ', requestId },
        { status: 401, headers: { 'X-Request-Id': requestId } }
      );
    }

    const body = await request.json();
    const { toolId, amount, slipUrl, slipBase64, slipMimeType, qrPayload } = body;

    if (!toolId) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลรายการที่สั่งซื้อ', requestId },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
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
        {
          error: 'รายการนี้ปิดจำหน่ายชั่วคราว ไม่สามารถสั่งซื้อได้ในขณะนี้ครับ',
          requestId,
        },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
    }

    if (existingAccess) {
      return NextResponse.json(
        {
          error: 'คุณมีสิทธิ์ใช้งานรายการนี้อยู่แล้ว ไม่จำเป็นต้องชำระเงินหรือส่งสลิปซ้ำครับ',
          alreadyOwned: true,
          requestId,
        },
        { status: 400, headers: { 'X-Request-Id': requestId } }
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
        {
          error: 'อัปโหลดรูปสลิปไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดส่งสลิปใหม่อีกครั้งครับ',
          requestId,
        },
        { status: 400, headers: { 'X-Request-Id': requestId } }
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

    // ─── CASE A: AI ตรวจสอบสลิปผ่าน 100% -> อนุมัติและปลดล็อกสิทธิ์ครบชุดแบบ Atomic ───
    if (verification.decision === 'approved') {
      const basePendingPayload = {
        user_id: user.id,
        user_email: user.email || '',
        tool_id: toolId,
        amount: expectedAmount,
        slip_url: finalSlipUrl,
        status: 'pending',
        admin_note: `${verification.fingerprintTag} ${verification.reason}`,
      };

      let orderData: any = null;
      if (existingOrderRow?.id) {
        const { data: updated } = await supabaseAdmin
          .from('orders')
          .update(basePendingPayload)
          .eq('id', existingOrderRow.id)
          .select()
          .single();
        orderData = updated;
      } else {
        const { data: inserted } = await supabaseAdmin
          .from('orders')
          .insert(basePendingPayload)
          .select()
          .single();
        orderData = inserted;
      }

      const targetOrderId = String(orderData?.id || existingOrderRow?.id || '');
      const grantResult = await approveOrderAndGrantBundle({
        orderId: targetOrderId,
        approvedBy: null,
        approvedByActor: 'system:auto_slip',
        requestId,
      });

      // Fallback safety: if DB grant encountered transient timeout/error after slip passed,
      // DO NOT return 500 — keep order pending with [GRANT_RETRY_NEEDED] and return 200 OK grant_delayed: true!
      if (!grantResult.ok) {
        const retryNote = `${verification.fingerprintTag} ${verification.reason} | [GRANT_RETRY_NEEDED:${grantResult.error || 'RPC_INTERNAL_ERROR'}]`;
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'pending',
            admin_note: retryNote,
            last_grant_error: grantResult.error || 'RPC_INTERNAL_ERROR',
          })
          .eq('id', targetOrderId);

        await notifyBundleGrantFailure({
          orderId: targetOrderId,
          userId: user.id,
          userEmail: user.email,
          errorCode: grantResult.error || 'RPC_INTERNAL_ERROR',
          errorMessage: `Slip verified by AI (${verification.reason}), but bundle grant delayed.`,
          requestId,
          context: 'POST /api/orders (AI Slip Verified)',
        });

        return NextResponse.json(
          {
            ...orderData,
            id: targetOrderId,
            status: 'pending',
            grant_delayed: true,
            ai_verified: true,
            message: BUNDLE_ERROR_CATALOG.RPC_INTERNAL_ERROR.messageTh,
            requestId,
          },
          { status: 200, headers: { 'X-Request-Id': requestId } }
        );
      }

      // ยิง Meta CAPI แบบ non-blocking
      sendMetaCapiEvent({
        eventName: 'Purchase',
        eventId: `order_${targetOrderId}`,
        orderId: targetOrderId,
        value: expectedAmount || 299,
        req: request,
        email: user.email || '',
        contentId: toolInfo?.slug || 'tiktok-ai-affiliate',
      }).catch((err) => console.error('[CAPI] Auto-approve Purchase error:', err));

      const tasks: Promise<any>[] = [
        notifyAiAutoApprovedOrder(
          customerName,
          user.email || '',
          grantResult.is_bundle ? `${toolName} (+ แถมฟรี 2 AI Tools ในชุดโปรโมชัน)` : toolName,
          `${expectedAmount.toLocaleString()} บาท`,
          finalSlipUrl,
          verification.reason
        ),
      ];

      if (user.email && user.email.includes('@')) {
        const emailHtml = buildOrderApprovedEmail({
          customerName,
          toolName: grantResult.is_bundle
            ? `${toolName} (พร้อมปลดล็อกฟรี PUP PAP Fashion Studio + PUPPAP AI UGC Product)`
            : toolName,
          toolSlug: toolInfo?.slug || '',
          keyCode: grantResult.key_code || '',
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

      return NextResponse.json(
        {
          ...orderData,
          id: targetOrderId,
          status: 'approved',
          license_key_id: grantResult.license_key_id,
          key_code: grantResult.key_code,
          is_bundle: grantResult.is_bundle,
          granted_slugs: grantResult.granted_slugs || [toolInfo?.slug],
          ai_verified: true,
          ai_reason: verification.reason,
          requestId,
        },
        { status: 200, headers: { 'X-Request-Id': requestId } }
      );
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

      return NextResponse.json(
        {
          ...orderData,
          status: 'rejected',
          ai_rejected: true,
          rejection_reason: verification.reason,
          requestId,
        },
        { status: 200, headers: { 'X-Request-Id': requestId } }
      );
    }

    // ─── CASE C: รอแอดมินตรวจสอบใน Telegram ───
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
        return NextResponse.json(
          { error: 'RPC_INTERNAL_ERROR', requestId },
          { status: 500, headers: { 'X-Request-Id': requestId } }
        );
      }
      orderData = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('orders')
        .insert(pendingPayload)
        .select()
        .single();
      if (insertErr) {
        return NextResponse.json(
          { error: 'RPC_INTERNAL_ERROR', requestId },
          { status: 500, headers: { 'X-Request-Id': requestId } }
        );
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

    return NextResponse.json(
      {
        ...orderData,
        status: 'pending',
        requestId,
      },
      { status: 200, headers: { 'X-Request-Id': requestId } }
    );
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'RPC_INTERNAL_ERROR', requestId },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
}

export async function GET(request: Request) {
  const requestId = extractRequestId(request);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401, headers: { 'X-Request-Id': requestId } }
      );
    }

    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');

    if (toolId) {
      const { data: targetTool } = await supabaseAdmin
        .from('tools')
        .select('id, slug')
        .eq('id', toolId)
        .maybeSingle();

      const isBundleTarget = isCourseBundleSlug(targetTool?.slug);
      let checkToolIds = [toolId];

      if (isBundleTarget) {
        const { data: bTools } = await supabaseAdmin
          .from('tools')
          .select('id')
          .in('slug', [...COURSE_BUNDLE_SLUGS])
          .eq('is_active', true);
        if (bTools && bTools.length > 0) {
          checkToolIds = bTools.map((t) => t.id);
        }
      }

      const [{ data: userTools }, { data: latestOrder }] = await Promise.all([
        supabaseAdmin
          .from('user_tools')
          .select('id, tool_id')
          .eq('user_id', user.id)
          .in('tool_id', checkToolIds)
          .eq('is_active', true),
        supabaseAdmin
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .in('tool_id', checkToolIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const hasAccess =
        Boolean(userTools && userTools.length > 0) || latestOrder?.status === 'approved';
      const cleanAdminNote = latestOrder?.admin_note
        ? String(latestOrder.admin_note).replace(/\[[A-Z0-9_-]+[^\]]*\]/g, '').trim()
        : '';

      const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const orderUpdatedMs = latestOrder?.updated_at
        ? new Date(latestOrder.updated_at).getTime()
        : latestOrder?.created_at
          ? new Date(latestOrder.created_at).getTime()
          : 0;

      const sharedKeyNotice =
        latestOrder?.status === 'rejected' &&
        latestOrder?.revoke_reason &&
        latestOrder?.kept_active_via_order_id &&
        orderUpdatedMs > sevenDaysAgoMs
          ? formatSharedKeyRevokeMessage({
              revokeReason: latestOrder.revoke_reason,
              orderId: latestOrder.id,
              keptActiveViaOrderId: latestOrder.kept_active_via_order_id,
              audience: 'customer',
            })
          : null;

      return NextResponse.json(
        {
          hasAccess,
          sharedKeyNotice,
          latestOrder: latestOrder
            ? {
                id: latestOrder.id,
                status: latestOrder.status,
                slip_url: latestOrder.slip_url,
                admin_note: cleanAdminNote,
                revoke_reason: latestOrder.revoke_reason || null,
                kept_active_via_order_id: latestOrder.kept_active_via_order_id || null,
                created_at: latestOrder.created_at,
                approved_at: latestOrder.approved_at,
                updated_at: latestOrder.updated_at || latestOrder.created_at,
              }
            : null,
          requestId,
        },
        { status: 200, headers: { 'X-Request-Id': requestId } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, tools(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data, {
      status: 200,
      headers: { 'X-Request-Id': requestId },
    });
  } catch (error: any) {
    console.error('[GET /api/orders] error:', error);
    return NextResponse.json(
      { error: 'RPC_INTERNAL_ERROR', requestId },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
}
