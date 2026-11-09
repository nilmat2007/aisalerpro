import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth/require-admin';
import { NextResponse } from 'next/server';
import { notifyOrderApproved } from '@/lib/telegram';
import { sendEmail, buildOrderApprovedEmail, buildOrderRejectedEmail } from '@/lib/email';
import { sendMetaCapiEvent } from '@/lib/meta-capi';
import {
  approveOrderAndGrantBundle,
  revokeCourseBundleEntitlements,
  BUNDLE_ERROR_CATALOG,
  extractRequestId,
  formatSharedKeyRevokeMessage,
  isAllInOneSlug,
  type BundleErrorCode,
} from '@/lib/course-bundle';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const requestId = extractRequestId(request);
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await props.params;
    const body = await request.json();
    const { action, note, revokeReason: rawRevokeReason } = body;

    const adminUserId = (auth as any).session?.user?.id || null;
    const isUuid =
      typeof adminUserId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminUserId);
    const validAdminUuid = isUuid ? adminUserId : null;
    const adminActor = validAdminUuid ? `admin:${validAdminUuid}` : 'admin:web';

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, user_email, tool_id, package_type, amount, slip_url, status, admin_note, license_key_id, created_at, approved_at, approved_by')
      .eq('id', id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        {
          ok: false,
          error: 'ORDER_NOT_FOUND',
          message: BUNDLE_ERROR_CATALOG.ORDER_NOT_FOUND.messageTh,
          requestId,
        },
        { status: 404, headers: { 'X-Request-Id': requestId } }
      );
    }

    if (action === 'approve' || action === 'retry_grant') {
      if (action === 'retry_grant') {
        await supabase
          .from('orders')
          .update({
            grant_retry_count: 0,
            grant_retry_exhausted: false,
            last_grant_error: null,
          })
          .eq('id', id);
      }

      const grantRes = await approveOrderAndGrantBundle({
        orderId: id,
        approvedBy: validAdminUuid,
        approvedByActor: adminActor,
        requestId,
      });

      if (!grantRes.ok) {
        const errCode = (grantRes.error || 'RPC_INTERNAL_ERROR') as BundleErrorCode;
        const catalogEntry =
          BUNDLE_ERROR_CATALOG[errCode] || BUNDLE_ERROR_CATALOG.RPC_INTERNAL_ERROR;
        const headers: Record<string, string> = { 'X-Request-Id': requestId };
        if (errCode === 'MAINTENANCE_MODE_ACTIVE') {
          headers['Retry-After'] = '120';
        }
        return NextResponse.json(
          {
            ok: false,
            error: errCode,
            message: catalogEntry.messageTh,
            requestId,
          },
          { status: catalogEntry.httpStatus, headers }
        );
      }

      const keyCode = grantRes.key_code || '';
      const { data: toolInfo } = await supabase
        .from('tools')
        .select('name, slug, price')
        .eq('id', order.tool_id)
        .single();

      if (!grantRes.already_approved) {
        const numericOrderValue =
          parseFloat(String(order.amount || toolInfo?.price || '159').replace(/[^0-9.]/g, '')) ||
          159;

        sendMetaCapiEvent({
          eventName: 'Purchase',
          eventId: `order_${order.id}`,
          orderId: String(order.id),
          value: numericOrderValue,
          req: request,
          email: order.user_email || '',
          contentId: toolInfo?.slug || 'tiktok-ai-affiliate',
        }).catch((err) => console.error('[CAPI] Admin approve Purchase error:', err));

        const isAllInOneOrder = isAllInOneSlug(toolInfo?.slug);
        await notifyOrderApproved(
          order.user_email,
          isAllInOneOrder
            ? `${toolInfo?.name || 'ไม่ระบุ'} (👑 ปลดล็อกครบคอร์สเรียน + เครื่องมือ AI ทั้งหมด)`
            : grantRes.is_bundle
            ? `${toolInfo?.name || 'ไม่ระบุ'} (+ แถมฟรี 2 AI Tools ในชุดโปรโมชัน)`
            : toolInfo?.name || 'ไม่ระบุ'
        );

        if (order.user_email && order.user_email.includes('@')) {
          const emailHtml = buildOrderApprovedEmail({
            customerName: order.user_email.split('@')[0],
            toolName: isAllInOneOrder
              ? `${toolInfo?.name || 'แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ 999'} (ปลดล็อกครบทั้งคอร์สเรียน 22 บทเรียน + เครื่องมือ AI ทุกตัวในระบบ)`
              : grantRes.is_bundle
              ? `${toolInfo?.name || 'เครื่องมือ AI'} (พร้อมปลดล็อกฟรี PUP PAP Fashion Studio + PUPPAP AI UGC Product)`
              : toolInfo?.name || 'เครื่องมือ AI',
            toolSlug: toolInfo?.slug || '',
            keyCode,
            amount: order.amount || toolInfo?.price || '',
          });
          await sendEmail({
            to: order.user_email,
            subject: `✅ คำสั่งซื้อ ${toolInfo?.name || 'เครื่องมือ AI'} ของคุณได้รับการอนุมัติแล้ว — PUP PAP AI`,
            html: emailHtml,
          }).catch((err) => console.error('Failed to send order approved email:', err));
        }
      }

      return NextResponse.json(
        {
          ok: true,
          success: true,
          keyCode,
          isBundle: grantRes.is_bundle,
          grantedSlugs: grantRes.granted_slugs,
          alreadyApproved: grantRes.already_approved,
          repaired: grantRes.repaired,
          requestId,
        },
        { status: 200, headers: { 'X-Request-Id': requestId } }
      );
    }

    if (
      action === 'reject' ||
      action === 'revoke' ||
      action === 'refund' ||
      action === 'chargeback'
    ) {
      const resolvedRevokeReason =
        rawRevokeReason !== undefined
          ? rawRevokeReason
          : action === 'refund'
            ? 'refund'
            : action === 'chargeback'
              ? 'chargeback'
              : 'admin_revoke';

      const finalNote = note || 'แอดมินยกเลิกสิทธิ์การใช้งาน (Revoked)';

      const revokeRes = await revokeCourseBundleEntitlements({
        orderId: id,
        adminId: validAdminUuid,
        reason: finalNote,
        revokeReason: resolvedRevokeReason,
        requestId,
      });

      if (!revokeRes.ok) {
        const errCode = (revokeRes.error || 'RPC_INTERNAL_ERROR') as BundleErrorCode;
        const catalogEntry =
          BUNDLE_ERROR_CATALOG[errCode] || BUNDLE_ERROR_CATALOG.RPC_INTERNAL_ERROR;
        const headers: Record<string, string> = { 'X-Request-Id': requestId };
        if (errCode === 'MAINTENANCE_MODE_ACTIVE') {
          headers['Retry-After'] = '120';
        }
        return NextResponse.json(
          {
            ok: false,
            error: errCode,
            message: catalogEntry.messageTh,
            requestId,
          },
          { status: catalogEntry.httpStatus, headers }
        );
      }

      const { data: toolInfo } = await supabase
        .from('tools')
        .select('name, slug, price')
        .eq('id', order.tool_id)
        .single();

      if (action === 'revoke' || action === 'refund' || order.status === 'approved') {
        const numericRefundValue =
          parseFloat(String(order.amount || toolInfo?.price || '159').replace(/[^0-9.]/g, '')) ||
          159;
        sendMetaCapiEvent({
          eventName: 'RefundRequest',
          eventId: `refund_${order.id}`,
          orderId: String(order.id),
          value: numericRefundValue,
          req: request,
          email: order.user_email || '',
          contentId: toolInfo?.slug || 'tiktok-ai-affiliate',
        }).catch((err) => console.error('[CAPI] RefundRequest error:', err));
      }

      const keptActiveViaOrderId = revokeRes.kept_active_via_order_id || null;
      const adminMessage = keptActiveViaOrderId
        ? formatSharedKeyRevokeMessage({
            revokeReason: revokeRes.revoke_reason || resolvedRevokeReason,
            orderId: id,
            keptActiveViaOrderId,
            audience: 'admin',
          })
        : null;

      if (order.user_email && order.user_email.includes('@') && !keptActiveViaOrderId) {
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
        }).catch((err) => console.error('Failed to send order rejected email:', err));
      }

      return NextResponse.json(
        {
          ok: true,
          success: true,
          revokeReason: revokeRes.revoke_reason || resolvedRevokeReason,
          keptActiveViaOrderId,
          adminMessage,
          revokedSlugs: revokeRes.revoked_slugs || [],
          retainedSlugs: revokeRes.retained_slugs || [],
          requestId,
        },
        { status: 200, headers: { 'X-Request-Id': requestId } }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'INVALID_ACTION', requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } }
    );
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'RPC_INTERNAL_ERROR',
        message: BUNDLE_ERROR_CATALOG.RPC_INTERNAL_ERROR.messageTh,
        requestId,
      },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
}
