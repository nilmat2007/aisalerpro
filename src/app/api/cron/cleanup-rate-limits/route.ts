import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const RATE_LIMIT_CLEANUP_MS = 60 * 60 * 1000; // 1 hour for /api/verify-password
const PV_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days for pv:* visitor analytics

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowMs = Date.now();
  const cutoffIso = new Date(nowMs - RATE_LIMIT_CLEANUP_MS).toISOString();
  const pvCutoffIso = new Date(nowMs - PV_RETENTION_MS).toISOString();

  try {
    // 1. Delete expired rate-limit attempts (older than 1 hour)
    const { error: rlError } = await supabaseAdmin
      .from('rate_limit_attempts')
      .delete()
      .eq('endpoint', '/api/verify-password')
      .lt('created_at', cutoffIso);

    if (rlError) {
      console.error('[cleanup-rate-limits] Failed to delete expired attempts:', rlError);
      return NextResponse.json({ ok: false, error: rlError.message }, { status: 500 });
    }

    // 2. Delete expired page-view analytics (older than 90 days)
    const { error: pvError } = await supabaseAdmin
      .from('rate_limit_attempts')
      .delete()
      .like('endpoint', 'pv:%')
      .lt('created_at', pvCutoffIso);

    if (pvError) {
      console.error('[cleanup-rate-limits] Failed to delete expired pv analytics:', pvError);
      return NextResponse.json({ ok: false, error: pvError.message }, { status: 500 });
    }

    // 3. Clean up any stale notify_lock rows older than 1 hour
    await supabaseAdmin
      .from('rate_limit_attempts')
      .delete()
      .eq('endpoint', 'notify_lock')
      .lt('created_at', cutoffIso);

    return NextResponse.json({ ok: true, cutoffIso, pvCutoffIso }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cleanup-rate-limits] Exception:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
