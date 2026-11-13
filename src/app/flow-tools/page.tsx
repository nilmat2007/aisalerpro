import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';
import FlowToolsClient from './FlowToolsClient';
import {
  PUBLIC_TOOL_SELECT_COLUMNS,
  sanitizeToolForPublic,
  type Tool,
} from '@/lib/sanitize-tool';
import {
  resolveUserBundleAccess,
  attemptCourseBundleHeal,
} from '@/lib/course-bundle';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'เครื่องมือ Flow พร้อมใช้ | PUP PAP AI',
  description: 'ศูนย์รวมเครื่องมือ Google Flow อัตโนมัติ คิดปุ๊บ คลิปปั๊บ สร้างวิดีโอ TikTok, Shopee, Reels',
};

export default async function FlowToolsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tools } = await supabase
    .from('tools')
    .select(PUBLIC_TOOL_SELECT_COLUMNS)
    .order('sort_order', { ascending: true });

  let userTools: any[] = [];
  let userTrials: any[] = [];
  const ownedSet = new Set<string>();

  if (user) {
    const [userToolsRes, userTrialsRes, keysByEmailRes, ordersByEmailRes, bundleAccess] = await Promise.all([
      supabase.from('user_tools').select('id, user_id, tool_id, license_key_id, activated_at, is_active').eq('user_id', user.id),
      supabase.from('user_trials').select('id, user_id, tool_id, status, started_at').eq('user_id', user.id),
      user.email
        ? supabase
            .from('license_keys')
            .select('id, tool_id, status')
            .in('status', ['activated', 'revoked'])
            .ilike('activated_email', user.email)
        : Promise.resolve({ data: [] as any[] }),
      user.email
        ? supabase
            .from('orders')
            .select('id, tool_id, license_key_id')
            .eq('status', 'approved')
            .ilike('user_email', user.email)
        : Promise.resolve({ data: [] as any[] }),
      resolveUserBundleAccess(supabaseAdmin, user.id, user.email || ''),
    ]);

    userTools = userToolsRes.data || [];
    userTrials = userTrialsRes.data || [];

    for (const ut of userTools) {
      if (ut.is_active !== false) ownedSet.add(ut.tool_id);
    }
    for (const tid of bundleAccess?.ownedToolIds || []) {
      ownedSet.add(tid);
    }

    let healed = false;
    if (bundleAccess?.needsBackgroundSync) {
      const healRes = await attemptCourseBundleHeal(supabaseAdmin, user.id, user.email || '');
      if (healRes.healed) healed = true;
    }

    const existingToolIds = new Set(userTools.map((ut: any) => ut.tool_id));
    const recoveredToolIds = new Set<string>();
    const allEmailKeys = keysByEmailRes.data || [];
    const activatedToolIds = new Set(
      allEmailKeys.filter((k: any) => k.status === 'activated').map((k: any) => k.tool_id)
    );
    const revokedKeyIds = new Set(
      allEmailKeys.filter((k: any) => k.status === 'revoked').map((k: any) => k.id)
    );
    const revokedToolIds = new Set(
      allEmailKeys
        .filter((k: any) => k.status === 'revoked' && !activatedToolIds.has(k.tool_id))
        .map((k: any) => k.tool_id)
    );

    for (const k of allEmailKeys) {
      if (k.status === 'activated' && k.tool_id && !existingToolIds.has(k.tool_id)) {
        recoveredToolIds.add(k.tool_id);
      }
    }
    for (const o of ordersByEmailRes.data || []) {
      const isRevokedOrder =
        (o.license_key_id && revokedKeyIds.has(o.license_key_id)) ||
        revokedToolIds.has(o.tool_id);
      if (!isRevokedOrder && o.tool_id && !existingToolIds.has(o.tool_id)) {
        recoveredToolIds.add(o.tool_id);
      }
    }

    if (recoveredToolIds.size > 0) {
      for (const toolId of recoveredToolIds) {
        await supabaseAdmin.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: toolId,
            activated_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        );
        ownedSet.add(toolId);
      }
      healed = true;
    }

    if (healed) {
      const { data: refreshedUserTools } = await supabaseAdmin
        .from('user_tools')
        .select('id, user_id, tool_id, license_key_id, activated_at, is_active')
        .eq('user_id', user.id);
      if (refreshedUserTools) userTools = refreshedUserTools;
    }
  }

  for (const ut of userTools) {
    if (ut.is_active !== false) ownedSet.add(ut.tool_id);
  }
  const nowMs = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const trialSet = new Set(
    userTrials
      .filter((tr: any) => {
        if (tr?.status !== 'active') return false;
        const startMs = tr?.started_at ? new Date(tr.started_at).getTime() : nowMs;
        const expMs = tr?.expires_at ? new Date(tr.expires_at).getTime() : startMs + SEVEN_DAYS_MS;
        return expMs > nowMs;
      })
      .map((tr: any) => tr.tool_id)
  );
  const sanitizedTools = ((tools || []) as unknown as Tool[]).map((t) =>
    sanitizeToolForPublic(t, {
      session: null,
      hasAccess: ownedSet.has(t.id),
      isTrial: trialSet.has(t.id),
    })
  );

  return (
    <FlowToolsClient
      tools={sanitizedTools}
      user={user}
      userTools={userTools}
      userTrials={userTrials}
    />
  );
}
