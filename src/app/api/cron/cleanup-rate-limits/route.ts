import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const RATE_LIMIT_CLEANUP_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoffIso = new Date(Date.now() - RATE_LIMIT_CLEANUP_MS).toISOString();

  const { error } = await supabaseAdmin
    .from('rate_limit_attempts')
    .delete()
    .lt('created_at', cutoffIso);

  if (error) {
    console.error('[cleanup-rate-limits] Failed to delete expired attempts:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cutoffIso }, { status: 200 });
}
