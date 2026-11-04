import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMetaCapiEvent } from '@/lib/meta-capi';
import { captureUtmContent, fbPurchase, fbRefundRequest } from '@/lib/meta-pixel';

describe('Meta Pixel & CAPI v3.1 Verification Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_FB_PIXEL_ID: '1234567890123456',
      FB_CAPI_ACCESS_TOKEN: 'EAATestToken123456',
      FB_TEST_EVENT_CODE: 'TEST99999',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('sendMetaCapiEvent sends all 5 required CAPI fields + utm_content + SHA-256 email + event_id deduplication', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 })
    );

    const req = new Request('https://puppapai.vercel.app/api/orders', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.42, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        referer: 'https://puppapai.vercel.app/checkout/tiktok-ai-affiliate',
        cookie: '_fbp=fb.1.1700000000000.111222333; _fbc=fb.1.1700000000000.IwAR12345; utm_content=hook_A',
      },
    });

    await sendMetaCapiEvent({
      eventName: 'Purchase',
      eventId: 'order_ord-999',
      orderId: 'ord-999',
      value: 299,
      req,
      email: 'TestBuyer@example.com',
      contentId: 'tiktok-ai-affiliate',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('https://graph.facebook.com/v20.0/1234567890123456/events');
    expect(String(url)).toContain('access_token=EAATestToken123456');

    const parsedBody = JSON.parse(String(init?.body));
    expect(parsedBody.test_event_code).toBe('TEST99999');
    expect(parsedBody.data).toHaveLength(1);

    const evt = parsedBody.data[0];
    expect(evt.event_name).toBe('Purchase');
    expect(evt.event_id).toBe('order_ord-999');
    expect(evt.action_source).toBe('website');
    expect(evt.user_data.client_ip_address).toBe('203.0.113.42');
    expect(evt.user_data.client_user_agent).toContain('iPhone');
    expect(evt.user_data.fbp).toBe('fb.1.1700000000000.111222333');
    expect(evt.user_data.fbc).toBe('fb.1.1700000000000.IwAR12345');
    expect(evt.user_data.em).toHaveLength(1);
    expect(evt.user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(evt.custom_data.value).toBe(299);
    expect(evt.custom_data.currency).toBe('THB');
    expect(evt.custom_data.content_name).toBe('course_hook_A');
    expect(evt.custom_data.content_ids).toEqual(['tiktok-ai-affiliate']);
  });

  it('sendMetaCapiEvent supports RefundRequest event for Course_Refunded_180D exclusion', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 })
    );

    const req = new Request('https://puppapai.vercel.app/api/refund', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '198.51.100.77',
        'user-agent': 'Mozilla/5.0',
        cookie: 'utm_content=hook_B',
      },
    });

    await sendMetaCapiEvent({
      eventName: 'RefundRequest',
      eventId: 'refund_ord-888',
      orderId: 'ord-888',
      value: 299,
      req,
      email: 'refund@example.com',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const parsedBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    const evt = parsedBody.data[0];
    expect(evt.event_name).toBe('RefundRequest');
    expect(evt.event_id).toBe('refund_ord-888');
    expect(evt.action_source).toBe('website');
    expect(evt.custom_data.content_name).toBe('course_hook_B');
  });

  it('Browser Pixel fbPurchase and fbRefundRequest capture utm_content and pass matching eventID', () => {
    const fbqMock = vi.fn();
    const store: Record<string, string> = {};

    vi.stubGlobal('window', {
      location: { search: '?utm_source=facebook&utm_content=hook_C&fbclid=IwAR_test_click_123' },
      fbq: fbqMock,
    });
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
    vi.stubGlobal('document', {
      cookie: '',
    });

    const captured = captureUtmContent();
    expect(captured).toBe('hook_C');
    expect(store['utm_content']).toBe('hook_C');

    fbPurchase({ orderId: 'ord-777', value: 299 });
    expect(fbqMock).toHaveBeenCalledWith(
      'track',
      'Purchase',
      {
        value: 299,
        currency: 'THB',
        content_name: 'course_hook_C',
        content_ids: ['tiktok-ai-affiliate'],
        content_type: 'product',
      },
      { eventID: 'order_ord-777' }
    );

    fbRefundRequest({ orderId: 'ord-777', value: 299 });
    expect(fbqMock).toHaveBeenCalledWith(
      'trackCustom',
      'RefundRequest',
      {
        value: 299,
        currency: 'THB',
        content_name: 'course_hook_C',
        content_ids: ['tiktok-ai-affiliate'],
        content_type: 'product',
      },
      { eventID: 'refund_ord-777' }
    );

    vi.unstubAllGlobals();
  });
});
