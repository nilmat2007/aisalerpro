'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

function AnnouncementCard({ ann, onDismiss }: { ann: any; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = ann.content && ann.content.length > 150;

  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full">
              {ann.badge_text || 'ประกาศ'}
            </span>
            <h3 className="font-bold text-white">{ann.title}</h3>
          </div>
          <button onClick={() => onDismiss(ann.id)} className="text-slate-500 hover:text-white text-lg shrink-0">✕</button>
        </div>
        <div className={`text-slate-300 text-sm leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {ann.content}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-cyan-400 text-xs mt-2 hover:underline"
          >
            {expanded ? '▲ ย่อ' : '▼ อ่านเพิ่มเติม'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardClient({ user, profile, userTools, allTools, announcements, userTrials }: any) {
  const router = useRouter();
  const supabase = createClient();
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseMsg, setLicenseMsg] = useState({ type: '', text: '' });
  const [activeAnnouncements, setActiveAnnouncements] = useState(announcements);
  const [trialToolIds, setTrialToolIds] = useState<Set<string>>(new Set(userTrials?.map((t: any) => t.tool_id) || []));
  const [startingTrial, setStartingTrial] = useState<string | null>(null);

  const startTrial = async (toolId: string) => {
    setStartingTrial(toolId);
    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId })
      });
      const data = await res.json();
      if (data.success || data.alreadyTried) {
        setTrialToolIds(prev => new Set([...prev, toolId]));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStartingTrial(null);
    }
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || 'ผู้ใช้งาน';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleActivate = async () => {
    if (!licenseKey) return;
    try {
      setLicenseMsg({ type: '', text: '' });
      const res = await fetch('/api/activate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyCode: licenseKey })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLicenseMsg({ type: 'success', text: '✅ ปลดล็อกสำเร็จ!' });
        setLicenseKey('');
        router.refresh(); // Refresh to get new tools
      } else {
        setLicenseMsg({ type: 'error', text: data.error || '❌ รหัสไม่ถูกต้องหรือถูกใช้ไปแล้ว' });
      }
    } catch (err) {
      setLicenseMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    }
  };

  const dismissAnnouncement = (id: string) => {
    setActiveAnnouncements(activeAnnouncements.filter((a: any) => a.id !== id));
  };

  const ownedToolIds = new Set(userTools?.map((ut: any) => ut.tool_id) || []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center">
              {displayName.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold">สวัสดี, {displayName}!</h1>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
          ออกจากระบบ
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {/* Announcements */}
        {activeAnnouncements.length > 0 && (
          <div className="space-y-3">
            {activeAnnouncements.map((ann: any) => (
              <AnnouncementCard key={ann.id} ann={ann} onDismiss={dismissAnnouncement} />
            ))}
          </div>
        )}

        {/* Tools Grid */}
        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="text-cyan-500">❖</span> เครื่องมือของคุณ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTools?.map((tool: any) => {
              const hasTool = ownedToolIds.has(tool.id);
              const posterImage = tool.poster_url || null;

              if (hasTool) {
                return (
                  <div key={tool.id} className="bg-gradient-to-b from-slate-800 to-slate-900 border border-green-500/30 rounded-2xl p-5 hover:border-green-400 transition-colors flex flex-col h-full">
                    {posterImage ? (
                      <div className="w-full aspect-[3/4] mb-4 rounded-xl overflow-hidden">
                        <img src={posterImage} alt={tool.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-3xl mb-4">
                        {tool.icon || '✨'}
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-white mb-2">{tool.name}</h3>
                    <p className="text-slate-400 text-sm mb-4 flex-grow">{tool.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800">
                      <span className="text-green-400 text-sm font-semibold flex items-center gap-1">🟢 ปลดล็อกแล้ว</span>
                      <Link href={`/tool/${tool.slug}`} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-lg text-sm font-semibold shadow-lg shadow-cyan-500/20">
                        เข้าใช้งาน
                      </Link>
                    </div>
                  </div>
                );
              } else {
                const hasTrial = trialToolIds.has(tool.id);
                const trialEnabled = tool.trial_enabled && tool.trial_flow_url;
                
                return (
                  <div key={tool.id} className={`bg-slate-900/50 border ${hasTrial ? 'border-amber-500/40' : 'border-slate-800'} rounded-2xl p-5 ${hasTrial ? 'opacity-100' : 'opacity-80 hover:opacity-100'} transition-opacity flex flex-col h-full`}>
                    {posterImage ? (
                      <div className={`w-full aspect-[3/4] mb-4 rounded-xl overflow-hidden ${hasTrial ? 'opacity-80' : 'opacity-50 grayscale'}`}>
                        <img src={posterImage} alt={tool.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl mb-4 ${hasTrial ? '' : 'grayscale'}`}>
                        {tool.icon || '🔒'}
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-slate-300 mb-2">{tool.name}</h3>
                    <p className="text-slate-500 text-sm mb-4 flex-grow">{tool.description}</p>
                    
                    {hasTrial ? (
                      /* Trial active - เคยทดลองใช้แล้ว */
                      <div className="mt-auto pt-4 border-t border-amber-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-400 text-sm flex items-center gap-1">🎁 ทดลองใช้แล้ว (3 คลิป)</span>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/tool/${tool.slug}?trial=1`} className="flex-1 text-center px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg text-sm font-semibold">
                            ▶️ เข้าใช้ตัวทดลอง
                          </Link>
                          <Link href={`/checkout/${tool.slug}`} className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold">
                            🛒 ซื้อเต็ม
                          </Link>
                        </div>
                      </div>
                    ) : (
                      /* ยังไม่ได้ซื้อ / ยังไม่ได้ทดลอง */
                      <div className="mt-auto pt-4 border-t border-slate-800/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-sm flex items-center gap-1">🔒 ยังไม่ได้ซื้อ</span>
                          <div className="flex gap-2">
                            <Link href={`/checkout/${tool.slug}`} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg text-sm font-semibold">
                              🛒 สั่งซื้อ
                            </Link>
                            <a href="https://m.me/100083126689322" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg text-sm font-semibold">
                              💬 สั่งซื้อ
                            </a>
                          </div>
                        </div>
                        {trialEnabled && (
                          <button
                            onClick={() => startTrial(tool.id)}
                            disabled={startingTrial === tool.id}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
                          >
                            {startingTrial === tool.id ? '⏳ กำลังเริ่ม...' : '🎁 ทดลองใช้ฟรี (3 คลิป)'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* License Activation */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 mt-12 max-w-xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-400">
            🔑 มีรหัสปลดล็อก?
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="กรอก License Key ของคุณ"
              className="flex-grow bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500/50 text-white"
            />
            <button
              onClick={handleActivate}
              disabled={!licenseKey}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ปลดล็อก
            </button>
          </div>
          {licenseMsg.text && (
            <p className={`mt-3 text-sm ${licenseMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {licenseMsg.text}
            </p>
          )}
        </div>
      </main>
      
      <footer className="text-center mt-20 text-slate-600 text-sm pb-8">
        © 2026 PHEEM AI TOOLKIT
      </footer>
    </div>
  );
}
