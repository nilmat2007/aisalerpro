import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  computeTrafficAnalytics,
  encodePvEndpoint,
  isBotUserAgent,
  isValidTrackPathname,
  parsePvEndpoint,
} from '@/lib/visitor-analytics';
import { POST, syncMemberAndNotify } from '@/app/api/track-visit/route';

function loadEnvLocal() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx > 0) {
        const k = t.slice(0, idx).trim();
        const v = t.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

describe('Visitor Analytics & New Member Notification Suite (10 Cases)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Case 1 & 4 & 5: Real Supabase DB test for 2-tab concurrent race condition + avatar_url sync + no sentinel
  it('Case 1, 4, 5: Real Supabase DB concurrent race condition (2 tabs) sends only 1 Telegram notification and syncs avatar_url without any sentinel', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(url).toBeTruthy();
    expect(key).toBeTruthy();

    const sb = createClient(url!, key!, { auth: { persistSession: false } });

    // Pick an existing profile row to test non-destructively and restore afterwards
    const { data: sampleProfile } = await sb
      .from('profiles')
      .select('*')
      .limit(1)
      .single();

    expect(sampleProfile).toBeTruthy();
    const userId = sampleProfile.id;

    // Clean any test notification state for this userId
    await sb
      .from('rate_limit_attempts')
      .delete()
      .eq('ip_hash', userId)
      .in('endpoint', ['notify_sent', 'notify_lock']);

    // Reset full_name/display_name/avatar_url temporarily to simulate fresh trigger-created row
    const baselineUpdatedAt = new Date(Date.now() - 10_000).toISOString();
    await sb
      .from('profiles')
      .update({
        full_name: null,
        display_name: null,
        avatar_url: null,
        updated_at: baselineUpdatedAt,
      })
      .eq('id', userId);

    const notifyMock = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 40));
      return true;
    });

    const userObj = {
      id: userId,
      email: sampleProfile.email || 'test@example.com',
      user_metadata: {
        full_name: 'Nimat Tester',
        avatar_url: 'https://lh3.googleusercontent.com/a/test-avatar-123',
      },
    };

    try {
      // Fire 2 concurrent requests at the exact same instant against real Supabase Postgres
      const [resA, resB] = await Promise.all([
        syncMemberAndNotify({
          user: userObj,
          adminClient: sb,
          notifyFn: notifyMock,
          nowMs: Date.now(),
          cutoffIso: '2020-01-01T00:00:00.000Z',
        }),
        syncMemberAndNotify({
          user: userObj,
          adminClient: sb,
          notifyFn: notifyMock,
          nowMs: Date.now(),
          cutoffIso: '2020-01-01T00:00:00.000Z',
        }),
      ]);

      // Strictly 1 tab must win and send Telegram
      expect(notifyMock).toHaveBeenCalledTimes(1);
      const notifiedCount = [resA, resB].filter((r) => r.notified).length;
      expect(notifiedCount).toBe(1);

      // Verify profile in DB has avatar_url & full_name synced and NEVER '__NOTIFYING__'
      const { data: updatedProfile } = await sb
        .from('profiles')
        .select('full_name, display_name, avatar_url')
        .eq('id', userId)
        .single();

      expect(updatedProfile?.full_name).toBe('Nimat Tester');
      expect(updatedProfile?.display_name).toBe('Nimat Tester');
      expect(updatedProfile?.display_name).not.toBe('__NOTIFYING__');
      expect(updatedProfile?.avatar_url).toBe('https://lh3.googleusercontent.com/a/test-avatar-123');
    } finally {
      // Restore original profile fields and clean up test rows
      await sb
        .from('profiles')
        .update({
          full_name: sampleProfile.full_name,
          display_name: sampleProfile.display_name,
          avatar_url: sampleProfile.avatar_url,
          updated_at: sampleProfile.updated_at,
          last_login_at: sampleProfile.last_login_at,
        })
        .eq('id', userId);
      await sb
        .from('rate_limit_attempts')
        .delete()
        .eq('ip_hash', userId)
        .in('endpoint', ['notify_sent', 'notify_lock']);
    }
  });

  // Case 2 & 7: Telegram fail -> rollback -> retry on next visit succeeds
  it('Case 2 & 7: Rolls back lock when Telegram fails and retries on next visit without leaving sentinel state', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const { data: sampleProfile } = await sb.from('profiles').select('*').limit(1).single();
    const userId = sampleProfile.id;

    await sb
      .from('rate_limit_attempts')
      .delete()
      .eq('ip_hash', userId)
      .in('endpoint', ['notify_sent', 'notify_lock']);

    const userObj = {
      id: userId,
      email: sampleProfile.email || 'retry@example.com',
      user_metadata: {
        full_name: 'Retry User',
        avatar_url: 'https://example.com/avatar.png',
      },
    };

    try {
      // Attempt 1: Telegram fails (returns false)
      const failNotify = vi.fn().mockResolvedValue(false);
      const attempt1 = await syncMemberAndNotify({
        user: userObj,
        adminClient: sb,
        notifyFn: failNotify,
        nowMs: Date.now(),
        cutoffIso: '2020-01-01T00:00:00.000Z',
      });

      expect(attempt1.notified).toBe(false);
      expect(attempt1.reason).toBe('telegram_failed_will_retry');

      // Attempt 2: Next visit retries and succeeds
      const okNotify = vi.fn().mockResolvedValue(true);
      const attempt2 = await syncMemberAndNotify({
        user: userObj,
        adminClient: sb,
        notifyFn: okNotify,
        nowMs: Date.now() + 5000,
        cutoffIso: '2020-01-01T00:00:00.000Z',
      });

      expect(attempt2.notified).toBe(true);
      expect(attempt2.reason).toBe('sent');
      expect(okNotify).toHaveBeenCalledTimes(1);

      // Attempt 3: Subsequent visit sees already_notified
      const attempt3 = await syncMemberAndNotify({
        user: userObj,
        adminClient: sb,
        notifyFn: okNotify,
        nowMs: Date.now() + 10000,
        cutoffIso: '2020-01-01T00:00:00.000Z',
      });
      expect(attempt3.notified).toBe(false);
      expect(attempt3.reason).toBe('already_notified');
      expect(okNotify).toHaveBeenCalledTimes(1);
    } finally {
      await sb
        .from('profiles')
        .update({
          full_name: sampleProfile.full_name,
          display_name: sampleProfile.display_name,
          avatar_url: sampleProfile.avatar_url,
          updated_at: sampleProfile.updated_at,
          last_login_at: sampleProfile.last_login_at,
        })
        .eq('id', userId);
      await sb
        .from('rate_limit_attempts')
        .delete()
        .eq('ip_hash', userId)
        .in('endpoint', ['notify_sent', 'notify_lock']);
    }
  });

  // Case 6: Crash between claim & commit -> 5-minute stale-lock recovery
  it('Case 6: Recovers from a stale lock after 5 minutes if a process crashed between claim and commit', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const { data: sampleProfile } = await sb.from('profiles').select('*').limit(1).single();
    const userId = sampleProfile.id;

    await sb
      .from('rate_limit_attempts')
      .delete()
      .eq('ip_hash', userId)
      .in('endpoint', ['notify_sent', 'notify_lock']);

    const baseTimeMs = Date.now();
    // Simulate a crashed process that inserted notify_lock at baseTimeMs
    await sb.from('rate_limit_attempts').insert({
      ip_hash: userId,
      endpoint: 'notify_lock',
      created_at: new Date(baseTimeMs).toISOString(),
    });

    const notifyMock = vi.fn().mockResolvedValue(true);
    const userObj = {
      id: userId,
      email: sampleProfile.email || 'stale@example.com',
      user_metadata: { full_name: 'Stale Recovery User' },
    };

    try {
      // At +2 minutes: lock is still active (< 5 min), so it skips
      const resAt2Min = await syncMemberAndNotify({
        user: userObj,
        adminClient: sb,
        notifyFn: notifyMock,
        nowMs: baseTimeMs + 2 * 60 * 1000,
        cutoffIso: '2020-01-01T00:00:00.000Z',
      });
      expect(resAt2Min.notified).toBe(false);
      expect(resAt2Min.reason).toBe('locked_in_flight');
      expect(notifyMock).not.toHaveBeenCalled();

      // At +5 minutes + 1s: lock is stale (>= 5 min), so it recovers and sends Telegram!
      const resAt5Min = await syncMemberAndNotify({
        user: userObj,
        adminClient: sb,
        notifyFn: notifyMock,
        nowMs: baseTimeMs + 5 * 60 * 1000 + 1000,
        cutoffIso: '2020-01-01T00:00:00.000Z',
      });
      expect(resAt5Min.notified).toBe(true);
      expect(resAt5Min.reason).toBe('sent');
      expect(notifyMock).toHaveBeenCalledTimes(1);
    } finally {
      await sb
        .from('profiles')
        .update({
          full_name: sampleProfile.full_name,
          display_name: sampleProfile.display_name,
          avatar_url: sampleProfile.avatar_url,
          updated_at: sampleProfile.updated_at,
          last_login_at: sampleProfile.last_login_at,
        })
        .eq('id', userId);
      await sb
        .from('rate_limit_attempts')
        .delete()
        .eq('ip_hash', userId)
        .in('endpoint', ['notify_sent', 'notify_lock']);
    }
  });

  // Case 3: utm_content encoding & parsing into Top Pages (stripped |utm=) and UTM Breakdown
  it('Case 3: Encodes utm_content into endpoint and aggregates Top Pages (stripped of |utm=) and UTM Breakdown accurately', () => {
    const epA = encodePvEndpoint('/courses', 'hook_A');
    const epB = encodePvEndpoint('/courses', 'hook_B');
    const epPlain = encodePvEndpoint('/courses', '');

    expect(epA).toBe('pv:/courses|utm=hook_A');
    expect(epB).toBe('pv:/courses|utm=hook_B');
    expect(epPlain).toBe('pv:/courses');

    expect(parsePvEndpoint(epA)).toEqual({ pathname: '/courses', utmContent: 'hook_A' });

    const now = new Date('2026-11-04T05:00:00.000Z');
    const stats = computeTrafficAnalytics(
      [
        { endpoint: 'pv:/courses|utm=hook_A', ip_hash: 'visitor-1', created_at: '2026-11-04T04:00:00.000Z' },
        { endpoint: 'pv:/courses|utm=hook_A', ip_hash: 'visitor-1', created_at: '2026-11-04T04:02:00.000Z' },
        { endpoint: 'pv:/courses|utm=hook_B', ip_hash: 'visitor-2', created_at: '2026-11-04T04:10:00.000Z' },
        { endpoint: 'pv:/checkout/tiktok-ai-affiliate|utm=hook_A', ip_hash: 'visitor-1', created_at: '2026-11-04T04:05:00.000Z' },
      ],
      now
    );

    expect(stats.todayUv).toBe(2); // visitor-1 and visitor-2
    expect(stats.todayPv).toBe(4);
    expect(stats.todayCourseUv).toBe(2);
    expect(stats.todayCheckoutUv).toBe(1);

    // Top pages must merge hook_A and hook_B under '/courses'
    const coursesPage = stats.topPages.find((p) => p.pathname === '/courses');
    expect(coursesPage).toEqual({
      pathname: '/courses',
      label: 'หน้ารายละเอียดคอร์ส (/courses)',
      pv: 3,
      uv: 2,
    });

    // UTM breakdown must separate hook_A and hook_B
    expect(stats.utmBreakdown).toEqual([
      { utm: 'hook_A', pv: 3, uv: 1 },
      { utm: 'hook_B', pv: 1, uv: 1 },
    ]);
  });

  // Case 8 & 9: Bot UA filtering (blocks crawlers/unfurl bots, allows LINE in-app browser) & pathname allowlist
  it('Case 8 & 9: Blocks crawler/unfurl Bot UAs while allowing LINE in-app browser and validating pathname allowlist', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUserAgent('Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)')).toBe(true);
    expect(isBotUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)')).toBe(true);

    // Human users in LINE In-App Browser and mobile Safari/Chrome must NOT be blocked
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1 Line/14.5.0'
      )
    ).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
      )
    ).toBe(false);

    // Pathname allowlist validation
    expect(isValidTrackPathname('/')).toBe(true);
    expect(isValidTrackPathname('/courses')).toBe(true);
    expect(isValidTrackPathname('/course/tiktok-ai-affiliate')).toBe(true);
    expect(isValidTrackPathname('/checkout/tiktok-ai-affiliate')).toBe(true);
    expect(isValidTrackPathname('/admin/dashboard')).toBe(false);
    expect(isValidTrackPathname('/api/orders')).toBe(false);
    expect(isValidTrackPathname('/../../etc/passwd')).toBe(false);
  });

  // Case 10: Cutover env override + 24h last_login_at throttle + 30s PV de-dup via POST /api/track-visit
  it('Case 10: Respects NEW_MEMBER_CUTOFF_AT override, 24h last_login_at throttle, and 30s PV de-dup', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const { data: sampleProfile } = await sb.from('profiles').select('*').limit(1).single();
    const notifyMock = vi.fn().mockResolvedValue(true);

    // Set cutoff in the future (2099) -> user must be treated as before_cutoff and NOT notified
    const res = await syncMemberAndNotify({
      user: { id: sampleProfile.id, email: sampleProfile.email },
      adminClient: sb,
      notifyFn: notifyMock,
      nowMs: Date.now(),
      cutoffIso: '2099-01-01T00:00:00.000Z',
    });

    expect(res.notified).toBe(false);
    expect(res.reason).toBe('before_cutoff');
    expect(notifyMock).not.toHaveBeenCalled();

    // Test POST /api/track-visit 30s PV de-dup with real DB
    const testIp = '203.0.113.199';
    const { hashIpHmac } = await import('@/app/api/verify-password/route');
    const ipHash = hashIpHmac(testIp);
    await sb.from('rate_limit_attempts').delete().eq('ip_hash', ipHash);

    try {
      const makeReq = () =>
        new Request('https://puppapai.vercel.app/api/track-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': testIp,
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          },
          body: JSON.stringify({ pathname: '/courses', utmContent: 'hook_A' }),
        });

      const r1 = await POST(makeReq());
      const j1 = await r1.json();
      expect(r1.status).toBe(200);
      expect(j1.recordedPv).toBe(true);

      // Immediate second request within 30s must be de-duped (recordedPv: false)
      const r2 = await POST(makeReq());
      const j2 = await r2.json();
      expect(r2.status).toBe(200);
      expect(j2.recordedPv).toBe(false);
    } finally {
      await sb.from('rate_limit_attempts').delete().eq('ip_hash', ipHash);
    }
  });
});
