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
    const [userToolsRes, userTrialsRes] = await Promise.all([
      supabase.from('user_tools').select('*').eq('user_id', user.id),
      supabase.from('user_trials').select('*').eq('user_id', user.id),
    ]);
    userTools = userToolsRes.data || [];
    userTrials = userTrialsRes.data || [];
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
