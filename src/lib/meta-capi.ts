import crypto from 'node:crypto';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;

  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export interface SendMetaCapiParams {
  eventName: 'Purchase' | 'InitiateCheckout';
  eventId: string;
  orderId: string;
  value: number;
  req: Request;
  email?: string;
  phone?: string;
  contentId?: string;
}

/**
 * Send server-side Conversions API (CAPI) event to Meta Graph API v20.0.
 * Non-blocking and fails gracefully if credentials are not configured yet.
 */
export async function sendMetaCapiEvent({
  eventName,
  eventId,
  orderId,
  value,
  req,
  email,
  phone,
  contentId = 'tiktok-ai-affiliate',
}: SendMetaCapiParams): Promise<void> {
  const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID?.trim();
  const TOKEN = process.env.FB_CAPI_ACCESS_TOKEN?.trim();
  const TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE?.trim();

  if (!PIXEL_ID || !TOKEN) {
    return;
  }

  const cookies = parseCookies(req.headers.get('cookie') || '');
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  const utmContent = cookies['utm_content'] || 'unknown';

  const userData: Record<string, any> = {
    client_ip_address: clientIp,
    client_user_agent: userAgent,
    fbc: cookies['_fbc'] || undefined,
    fbp: cookies['_fbp'] || undefined,
  };

  if (email && email.trim()) {
    userData.em = [sha256(email)];
  }
  if (phone && phone.trim()) {
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly) {
      userData.ph = [sha256(digitsOnly)];
    }
  }

  const payload: Record<string, any> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || `order_${orderId}`,
        event_source_url: req.headers.get('referer') || req.url,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          value,
          currency: 'THB',
          content_ids: [contentId],
          content_type: 'product',
          content_name: `course_${utmContent}`,
          order_id: orderId,
        },
      },
    ],
  };

  if (TEST_EVENT_CODE) {
    payload.test_event_code = TEST_EVENT_CODE;
  }

  try {
    await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(PIXEL_ID)}/events?access_token=${encodeURIComponent(TOKEN)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  } catch (err) {
    console.error('[CAPI] Failed:', err);
  }
}
