import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ToolGuideClient from './ToolGuideClient'

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hasAccess = false;
  let loggedIn = !!user;

  if (user) {
    const { data: tool } = await supabase.from('tools').select('id').eq('slug', slug).single()
    if (tool) {
      const { data: userTool } = await supabase.from('user_tools').select('*').eq('user_id', user.id).eq('tool_id', tool.id).single()
      if (userTool) {
        hasAccess = true;
      }
    }
  }

  if (loggedIn && !hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950">
        <h1 className="text-3xl text-white font-bold mb-4">ยังไม่ได้ซื้อเครื่องมือนี้</h1>
        <Link href="/store" className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          ดูรายละเอียดที่ร้านค้า
        </Link>
      </div>
    )
  }

  return <ToolGuideClient slug={slug} hasAccess={hasAccess} loggedIn={loggedIn} />
}
