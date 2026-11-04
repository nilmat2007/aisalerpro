import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getClientIp, hashIpHmac } from '@/app/api/verify-password/route';
import { notifyNewMember } from '@/lib/telegram';
import {
  DEFAULT_NEW_MEMBER_CUTOFF_AT,
  LAST_LOGIN_THROTTLE_MS,
  PV_DEDUP_WINDOW_MS,
  PV_RATE_LIMIT_MAX_PER_MIN,
  PV_RATE_LIMIT_WINDOW_MS,
  STALE_LOCK_MS,
  encodePvEndpoint,
  isBotUserAgent,
  isValidTrackPathname,
} from '@/lib/visitor-analytics';

export interface SyncMemberOptions {
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
  };
  adminClient?: any;
  notifyFn?: (name: string, email: string) => Promise<boolean>;
  nowMs?: number;
  cutoffIso?: string;
}

/**
 * Atomic member profile sync + first-login Telegram notification with:
 * - Zero sentinel pollution in `full_name` / `display_name`
 * - `avatar_url` sync from Google OAuth metadata
 * - 24h `last_login_at` write throttle
 * - Atomic row-level claim on `profiles.updated_at` + `notify_lock` / `notify_sent`
 * - 5-minute stale-lock recovery & automatic retry when Telegram fails
 */
export async function syncMemberAndNotify({
  user,
  adminClient = supabaseAdmin,
  notifyFn = notifyNewMember,
  nowMs = Date.now(),
  cutoffIso = process.env.NEW_MEMBER_CUTOFF_AT || DEFAULT_NEW_MEMBER_CUTOFF_AT,
}: SyncMemberOptions): Promise<{
  notified: boolean;
  reason: string;
  syncedProfile: boolean;
  updatedLastLogin: boolean;
}> {
  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .select('id, email, full_name, display_name, avatar_url, created_at, updated_at, last_login_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return { notified: false, reason: 'profile_not_found', syncedProfile: false, updatedLastLogin: false };
  }

  const resolvedName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    profile.full_name ||
    profile.display_name ||
    user.email?.split('@')[0] ||
    profile.email?.split('@')[0] ||
    'ไม่ทราบชื่อ';

  const resolvedAvatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    profile.avatar_url ||
    null;

  const resolvedEmail = user.email || profile.email || '';

  const needsProfileSync =
    !profile.full_name ||
    !profile.display_name ||
    (Boolean(resolvedAvatar) && !profile.avatar_url);

  const lastLoginMs = profile.last_login_at ? new Date(profile.last_login_at).getTime() : 0;
  const needsLastLoginUpdate =
    !profile.last_login_at ||
    Number.isNaN(lastLoginMs) ||
    nowMs - lastLoginMs >= LAST_LOGIN_THROTTLE_MS;

  // Check if user registered on or after the cutoff timestamp
  const createdMs = profile.created_at ? new Date(profile.created_at).getTime() : 0;
  const cutoffMs = new Date(cutoffIso).getTime();
  const isEligibleNewSignup = createdMs >= cutoffMs;

  // If pre-cutoff legacy user, just sync profile / throttled last_login_at if needed
  if (!isEligibleNewSignup) {
    if (needsProfileSync || needsLastLoginUpdate) {
      const updatePayload: Record<string, any> = {};
      if (needsProfileSync) {
        updatePayload.full_name = resolvedName;
        updatePayload.display_name = resolvedName;
        updatePayload.avatar_url = resolvedAvatar;
      }
      if (needsLastLoginUpdate) {
        updatePayload.last_login_at = new Date(nowMs).toISOString();
      }
      await adminClient.from('profiles').update(updatePayload).eq('id', user.id);
    }
    return {
      notified: false,
      reason: 'before_cutoff',
      syncedProfile: needsProfileSync,
      updatedLastLogin: needsLastLoginUpdate,
    };
  }

  // Check notification state in rate_limit_attempts (notify_sent / notify_lock)
  const { data: stateRows } = await adminClient
    .from('rate_limit_attempts')
    .select('id, endpoint, created_at')
    .eq('ip_hash', user.id)
    .in('endpoint', ['notify_sent', 'notify_lock'])
    .order('created_at', { ascending: false });

  const rows = Array.isArray(stateRows) ? stateRows : [];
  const sentRow = rows.find((r: any) => r.endpoint === 'notify_sent');
  if (sentRow) {
    // Already notified previously; only apply 24h last_login_at throttle or missing profile sync
    if (needsProfileSync || needsLastLoginUpdate) {
      const updatePayload: Record<string, any> = {};
      if (needsProfileSync) {
        updatePayload.full_name = resolvedName;
        updatePayload.display_name = resolvedName;
        updatePayload.avatar_url = resolvedAvatar;
      }
      if (needsLastLoginUpdate) {
        updatePayload.last_login_at = new Date(nowMs).toISOString();
      }
      await adminClient.from('profiles').update(updatePayload).eq('id', user.id);
    }
    return {
      notified: false,
      reason: 'already_notified',
      syncedProfile: needsProfileSync,
      updatedLastLogin: needsLastLoginUpdate,
    };
  }

  // Check for active or stale lock (5-minute stale-lock recovery)
  const lockRows = rows.filter((r: any) => r.endpoint === 'notify_lock');
  for (const lock of lockRows) {
    const lockAgeMs = nowMs - new Date(lock.created_at).getTime();
    if (lockAgeMs < STALE_LOCK_MS) {
      return {
        notified: false,
        reason: 'locked_in_flight',
        syncedProfile: false,
        updatedLastLogin: false,
      };
    }
    // Stale lock (>= 5 minutes old): remove so this request can recover & retry
    await adminClient.from('rate_limit_attempts').delete().eq('id', lock.id);
  }

  // Atomic Postgres row-level claim on `profiles.updated_at`
  // Guarantee `nextUpdatedAt` differs from `profile.updated_at` so concurrent requests see updated_at changed
  const prevUpdatedMs = profile.updated_at ? new Date(profile.updated_at).getTime() : 0;
  const claimMs = nowMs <= prevUpdatedMs ? prevUpdatedMs + 1 : nowMs;
  const claimIso = new Date(claimMs).toISOString();

  const profileClaimPayload: Record<string, any> = {
    full_name: resolvedName,
    display_name: resolvedName,
    avatar_url: resolvedAvatar,
    updated_at: claimIso,
  };
  if (needsLastLoginUpdate) {
    profileClaimPayload.last_login_at = new Date(nowMs).toISOString();
  }

  let claimQuery = adminClient
    .from('profiles')
    .update(profileClaimPayload)
    .eq('id', user.id);

  if (profile.updated_at) {
    claimQuery = claimQuery.eq('updated_at', profile.updated_at);
  } else {
    claimQuery = claimQuery.is('updated_at', null);
  }

  const { data: claimedRows, error: claimErr } = await claimQuery.select('id');
  if (claimErr || !Array.isArray(claimedRows) || claimedRows.length !== 1) {
    return {
      notified: false,
      reason: 'claim_lost_race',
      syncedProfile: false,
      updatedLastLogin: false,
    };
  }

  // Record in-flight lock with timestamp
  const { data: insertedLock } = await adminClient
    .from('rate_limit_attempts')
    .insert({
      ip_hash: user.id,
      endpoint: 'notify_lock',
      created_at: new Date(nowMs).toISOString(),
    })
    .select('id')
    .maybeSingle();

  // Send Telegram notification
  const sentOk = await notifyFn(resolvedName, resolvedEmail);

  if (sentOk) {
    await adminClient.from('rate_limit_attempts').insert({
      ip_hash: user.id,
      endpoint: 'notify_sent',
      created_at: new Date(nowMs).toISOString(),
    });
    if (insertedLock?.id) {
      await adminClient.from('rate_limit_attempts').delete().eq('id', insertedLock.id);
    }
    return {
      notified: true,
      reason: 'sent',
      syncedProfile: true,
      updatedLastLogin: needsLastLoginUpdate,
    };
  }

  // Rollback lock on Telegram failure so next visit retries immediately
  if (insertedLock?.id) {
    await adminClient.from('rate_limit_attempts').delete().eq('id', insertedLock.id);
  } else {
    await adminClient
      .from('rate_limit_attempts')
      .delete()
      .eq('ip_hash', user.id)
      .eq('endpoint', 'notify_lock');
  }

  return {
    notified: false,
    reason: 'telegram_failed_will_retry',
    syncedProfile: true,
    updatedLastLogin: needsLastLoginUpdate,
  };
}

export async function POST(request: Request) {
  try {
    const ua = request.headers.get('user-agent');
    if (isBotUserAgent(ua)) {
      return NextResponse.json({ ok: true, skipped: 'bot_ua' });
    }

    const body = await request.json().catch(() => ({}));
    const { pathname, utmContent } = body || {};

    if (!isValidTrackPathname(pathname)) {
      return NextResponse.json({ error: 'Invalid pathname' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipHash = hashIpHmac(ip);
    const nowMs = Date.now();
    const oneMinAgoIso = new Date(nowMs - PV_RATE_LIMIT_WINDOW_MS).toISOString();
    const endpointKey = encodePvEndpoint(pathname, utmContent);

    // 1. Check per-IP rate limit (max 30 PV/min) & 30-second same-page de-dup
    const { data: recentVisits, error: selectErr } = await supabaseAdmin
      .from('rate_limit_attempts')
      .select('id, endpoint, created_at')
      .eq('ip_hash', ipHash)
      .like('endpoint', 'pv:%')
      .gte('created_at', oneMinAgoIso)
      .order('created_at', { ascending: false });

    if (selectErr) {
      console.error('[track-visit] select error:', selectErr);
      return NextResponse.json({ error: 'Rate check error' }, { status: 500 });
    }

    const recentList = Array.isArray(recentVisits) ? recentVisits : [];
    if (recentList.length >= PV_RATE_LIMIT_MAX_PER_MIN) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const thirtySecCutoffMs = nowMs - PV_DEDUP_WINDOW_MS;
    const isDuplicateWithin30s = recentList.some((row: any) => {
      const rowPathname = String(row.endpoint || '').split('|utm=')[0];
      const targetPathname = `pv:${pathname}`;
      return (
        rowPathname === targetPathname &&
        new Date(row.created_at).getTime() >= thirtySecCutoffMs
      );
    });

    let recordedPv = false;
    if (!isDuplicateWithin30s) {
      const { error: insertErr } = await supabaseAdmin.from('rate_limit_attempts').insert({
        ip_hash: ipHash,
        endpoint: endpointKey,
        created_at: new Date(nowMs).toISOString(),
      });
      if (!insertErr) {
        recordedPv = true;
      }
    }

    // 2. Check cookie-based logged-in user for atomic new member notification & 24h last_login_at sync
    let memberSyncResult: any = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        memberSyncResult = await syncMemberAndNotify({
          user,
          adminClient: supabaseAdmin,
          nowMs,
        });
      }
    } catch {
      // Ignore auth session read errors on public pages
    }

    return NextResponse.json({
      ok: true,
      recordedPv,
      endpoint: endpointKey,
      memberSync: memberSyncResult,
    });
  } catch (err: any) {
    console.error('[track-visit] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
