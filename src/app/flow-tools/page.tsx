import { createClient } from '@/lib/supabase/server';
import FlowToolsClient from './FlowToolsClient';

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
    .select('*')
    .order('sort_order', { ascending: true });

  let userTools: any[] = [];
  let userTrials: any[] = [];

  if (user) {
    const [userToolsRes, userTrialsRes, keysByEmailRes, ordersByEmailRes] = await Promise.all([
      supabase.from('user_tools').select('*').eq('user_id', user.id),
      supabase.from('user_trials').select('*').eq('user_id', user.id),
      user.email
        ? supabase
            .from('license_keys')
            .select('id, tool_id')
            .eq('status', 'activated')
            .ilike('activated_email', user.email)
        : Promise.resolve({ data: [] as any[] }),
      user.email
        ? supabase
            .from('orders')
            .select('id, tool_id')
            .eq('status', 'approved')
            .ilike('user_email', user.email)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    userTools = userToolsRes.data || [];
    userTrials = userTrialsRes.data || [];

    const existingToolIds = new Set(userTools.map((ut: any) => ut.tool_id));
    const recoveredToolIds = new Set<string>();

    for (const k of keysByEmailRes.data || []) {
      if (k.tool_id && !existingToolIds.has(k.tool_id)) recoveredToolIds.add(k.tool_id);
    }
    for (const o of ordersByEmailRes.data || []) {
      if (o.tool_id && !existingToolIds.has(o.tool_id)) recoveredToolIds.add(o.tool_id);
    }

    if (recoveredToolIds.size > 0) {
      for (const toolId of recoveredToolIds) {
        await supabase.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: toolId,
            unlocked_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        );
      }
      const { data: refreshedUserTools } = await supabase
        .from('user_tools')
        .select('*')
        .eq('user_id', user.id);
      if (refreshedUserTools) userTools = refreshedUserTools;
    }
  }

  return (
    <FlowToolsClient
      tools={tools || []}
      user={user}
      userTools={userTools}
      userTrials={userTrials}
    />
  );
}
