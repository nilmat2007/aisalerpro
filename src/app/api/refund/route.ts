import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { sendMetaCapiEvent } from '@/lib/meta-capi';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, email, value = 159, contentId = 'tiktok-ai-affiliate' } = body || {};

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Fire-and-forget non-blocking CAPI RefundRequest event for Course_Refunded_180D exclusion
    sendMetaCapiEvent({
      eventName: 'RefundRequest',
      eventId: `refund_${orderId}`,
      orderId: String(orderId),
      value: Number(value) || 159,
      req,
      email: email || '',
      contentId,
    }).catch((err) => console.error('[CAPI] RefundRequest route error:', err));

    return NextResponse.json({ ok: true, eventId: `refund_${orderId}` });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
