import { describe, it, expect } from 'vitest';
import {
  buildAdminDashboardPayload,
  fetchAllPvRowsPaginated,
  toBangkokDateAndHour,
} from '@/lib/admin-analytics';
import {
  encodePvEndpoint,
  parsePvEndpoint,
  parsePvEndpointExtended,
  type PvRow,
} from '@/lib/visitor-analytics';

describe('Admin Deep Drill-Down Analytics Engine', () => {
  it('1. Paginates past PostgREST 1,000-row cap so older days never truncate to 0', async () => {
    // Simulate 2,450 rows in Supabase where PostgREST returns max 1,000 rows per .range() call
    const totalFakeRows: PvRow[] = Array.from({ length: 2450 }, (_, i) => ({
      endpoint: i % 2 === 0 ? 'pv:/tool/puppap-drama' : 'pv:/',
      ip_hash: `visitor-${i % 300}`,
      created_at: new Date(Date.now() - i * 60_000).toISOString(),
    }));

    const mockSupabase: any = {
      from: () => {
        const chain: any = {
          select: () => chain,
          like: () => chain,
          gte: () => chain,
          order: () => chain,
          range: async (from: number, to: number) => ({
            data: totalFakeRows.slice(from, to + 1),
            error: null,
          }),
        };
        return chain;
      },
    };

    const res = await fetchAllPvRowsPaginated(mockSupabase, '2026-11-01T00:00:00.000Z', {
      batchSize: 1000,
      maxBatches: 10,
    });

    expect(res.capped).toBe(false);
    expect(res.rows.length).toBe(2450);
  });

  it('2. Converts UTC timestamps between 00:00 and 06:59 BKK to the correct Thailand date and hour', () => {
    // 2026-11-25T23:52:54.154Z = 2026-11-26 06:52:54 ICT (UTC+7)
    const converted = toBangkokDateAndHour('2026-11-25T23:52:54.154+00:00');
    expect(converted.dateKey).toBe('2026-11-26');
    expect(converted.hour).toBe(6);
  });

  it('3. Unifies web orders (using exact orders.amount) and standalone license keys with zero double-counting', () => {
    const now = new Date('2026-11-26T05:00:00.000Z');
    const payload = buildAdminDashboardPayload({
      now,
      lookbackDays: 7,
      tools: [
        {
          id: 'tool-aio',
          slug: 'puppap-all-in-one',
          name: 'แพ็กเกจเหมาๆ 799',
          icon: '👑',
          price: '999 บาท', // Even if label had old price, web order must use exact orders.amount (799)
          is_active: true,
          is_coming_soon: false,
        },
        {
          id: 'tool-ugc',
          slug: 'ugc-batch',
          name: 'UGC Batch',
          icon: '🔥',
          price: '699 บาท',
          is_active: true,
          is_coming_soon: false,
        },
      ],
      orders: [
        {
          id: 'ord-1',
          user_id: 'u-1',
          user_email: 'buyer1@example.com',
          tool_id: 'tool-aio',
          amount: 799,
          status: 'approved',
          license_key_id: 'key-linked-1',
          admin_note: '[APPROVED at 2026-11-26T00:00:00Z by system:auto_slip]',
          created_at: '2026-11-25T23:52:54.154Z',
          approved_at: '2026-11-25T23:53:00.000Z',
        },
        {
          id: 'ord-rej-1',
          user_id: 'u-2',
          user_email: 'almost@example.com',
          tool_id: 'tool-aio',
          amount: 799,
          status: 'rejected',
          admin_note: 'สลิปนี้โอนเกินเวลาที่กำหนด [AI-REJECTED-OLD]',
          created_at: '2026-11-26T01:00:00.000Z',
        },
      ],
      licenses: [
        {
          id: 'key-linked-1',
          key_code: 'PHM-AAAA-BBBB',
          tool_id: 'tool-aio',
          status: 'activated',
          activated_by: 'u-1',
          activated_email: 'buyer1@example.com',
          activated_at: '2026-11-25T23:53:00.000Z',
        },
        {
          id: 'key-direct-2',
          key_code: 'PHM-CCCC-DDDD',
          tool_id: 'tool-ugc',
          status: 'activated',
          activated_by: 'u-3',
          activated_email: 'direct@example.com',
          activated_at: '2026-11-24T10:00:00.000Z',
          note: 'Telegram Bot',
        },
      ],
      profiles: [
        {
          id: 'u-1',
          email: 'buyer1@example.com',
          display_name: 'Buyer One',
          created_at: '2026-11-25T23:50:00.000Z',
        },
        {
          id: 'u-2',
          email: 'almost@example.com',
          display_name: 'Almost Buyer',
          created_at: '2026-11-26T00:50:00.000Z',
        },
      ],
      trials: [],
      pvRows: [
        {
          endpoint: 'pv:/tool/puppap-all-in-one|utm=fb_ad_1|src=facebook|dev=mobile',
          ip_hash: 'hash-a',
          created_at: '2026-11-25T23:51:00.000Z',
        },
        {
          endpoint: 'pv:/checkout/puppap-all-in-one|utm=fb_ad_1|src=facebook|dev=mobile',
          ip_hash: 'hash-a',
          created_at: '2026-11-25T23:52:00.000Z',
        },
      ],
    });

    // Must be exactly 2 sales (key-linked-1 not double-counted!)
    expect(payload.sales.length).toBe(2);
    const webSale = payload.sales.find((s) => s.orderId === 'ord-1')!;
    expect(webSale.amount).toBe(799);
    expect(webSale.channel).toBe('web_auto_slip');
    expect(webSale.dateKey).toBe('2026-11-26'); // 06:53 AM Bangkok!

    const directSale = payload.sales.find((s) => s.licenseKeyId === 'key-direct-2')!;
    expect(directSale.amount).toBe(699);
    expect(directSale.channel).toBe('direct_key');

    // Rejected old slip surfaces in attentionOrders and hotLeads (while paid buyer u-1 is NOT in hotLeads)
    expect(payload.attentionOrders.length).toBe(1);
    expect(payload.attentionOrders[0].rejectCategory).toBe('old_slip');
    expect(payload.hotLeads.some((l) => l.email === 'almost@example.com')).toBe(true);
    expect(payload.hotLeads.some((l) => l.email === 'buyer1@example.com')).toBe(false);

    // Zero raw ip_hash leaked into compact visits
    expect(JSON.stringify(payload.visits)).not.toContain('hash-a');
    expect(payload.visits.length).toBe(2);
  });

  it('4. Preserves 100% backward compatibility on encodePvEndpoint & parsePvEndpoint while supporting extended source/device tags', () => {
    const legacy = encodePvEndpoint('/courses', 'hook_A');
    expect(legacy).toBe('pv:/courses|utm=hook_A');
    expect(parsePvEndpoint(legacy)).toEqual({ pathname: '/courses', utmContent: 'hook_A' });

    const extended = encodePvEndpoint('/tool/puppap-drama', 'drama_ad1', {
      source: 'facebook',
      device: 'mobile',
    });
    expect(extended).toBe('pv:/tool/puppap-drama|utm=drama_ad1|src=facebook|dev=mobile');
    expect(parsePvEndpoint(extended)).toEqual({
      pathname: '/tool/puppap-drama',
      utmContent: 'drama_ad1',
    });
    expect(parsePvEndpointExtended(extended)).toEqual({
      pathname: '/tool/puppap-drama',
      utmContent: 'drama_ad1',
      source: 'facebook',
      device: 'mobile',
    });
  });
});
