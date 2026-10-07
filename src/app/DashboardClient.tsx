'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatToolUpdateDate } from '@/lib/date-utils';
import ThemeToggle from '@/components/ThemeToggle';

function AnnouncementCard({ ann, onDismiss }: { ann: any; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = ann.content && ann.content.length > 150;

  return (
    <div className="puppap-card p-4 border-[var(--border-light)] overflow-hidden">
      <div>
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)] text-xs font-bold rounded-full">
              {ann.badge_text || '📢 ประกาศ'}
            </span>
            <h3 className="font-bold text-[var(--text-primary)]">{ann.title}</h3>
          </div>
          <button onClick={() => onDismiss(ann.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg shrink-0">✕</button>
        </div>
        <div className={`text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {ann.content}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[var(--accent)] text-xs mt-2 hover:underline font-semibold"
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
    <div className="min-h-screen text-[var(--text-primary)] p-4 sm:p-6 transition-colors duration-200">
      
      {/* Header Card matching pheembot extension screenshot */}
      <header className="max-w-6xl mx-auto puppap-card p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link href="/" className="shrink-0 group">
            <img 
              src="/images/logo-puppap-ai.png" 
              alt="PUP PAP AI" 
              className="w-12 h-12 rounded-2xl object-cover border-[1.5px] border-[var(--border)] bg-white shadow-sm group-hover:scale-105 transition-transform" 
            />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">PUP PAP AI</h1>
              <span className="puppap-badge-pro">
                PRO · LIFETIME
              </span>
              <span className="text-[11px] font-semibold text-[var(--accent)] hidden md:inline">
                · คิดปุ๊บ คลิปปั๊บ 🔄
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              สวัสดี, <span className="font-semibold text-[var(--accent)]">{displayName}</span> 👋 · พร้อมสร้างคอนเทนต์ทุกแพลตฟอร์ม
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-end sm:self-center">
          {avatarUrl && (
            <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border-[1.5px] border-[var(--border)]" />
          )}
          <ThemeToggle size="md" />
          <button onClick={handleLogout} className="puppap-btn-secondary px-4 py-1.5 text-xs">
            ออกจากระบบ
          </button>
        </div>
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
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
            <span className="text-[var(--accent)]">❖</span> เครื่องมือของคุณ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTools?.map((tool: any) => {
              const hasTool = ownedToolIds.has(tool.id);
              const posterImage = tool.poster_url || null;
              const updateInfo = formatToolUpdateDate(tool.updated_at);

              if (hasTool) {
                return (
                  <div key={tool.id} className="puppap-card p-5 border-emerald-500/60 hover:border-emerald-500 transition-colors flex flex-col h-full shadow-md">
                    {posterImage ? (
                      <div className="w-full aspect-[3/4] mb-4 rounded-xl overflow-hidden border border-[var(--border-light)] bg-black/10">
                        <img src={posterImage} alt={tool.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border-light)] flex items-center justify-center text-3xl mb-4">
                        {tool.icon || '✨'}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      {tool.version && (
                        <span className="px-2 py-0.5 bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)] font-mono text-[11px] rounded-md font-semibold">
                          {tool.version}
                        </span>
                      )}
                      {updateInfo && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                          updateInfo.isRecent
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-[var(--bg-deep)] border-[var(--border-light)] text-[var(--text-muted)]'
                        }`}>
                          {updateInfo.text}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{tool.name}</h3>
                    <p className="text-[var(--text-secondary)] text-sm mb-4 flex-grow">{tool.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-light)]">
                      <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ปลดล็อกแล้ว
                      </span>
                      <Link href={`/tool/${tool.slug}`} className="puppap-btn-primary px-4 py-2 text-sm">
                        เข้าใช้งาน
                      </Link>
                    </div>
                  </div>
                );
              } else {
                const hasTrial = trialToolIds.has(tool.id);
                const trialEnabled = tool.trial_enabled && tool.trial_flow_url;
                
                return (
                  <div key={tool.id} className={`puppap-card p-5 flex flex-col h-full ${hasTrial ? 'border-amber-500/50' : 'border-[var(--border-light)] opacity-90 hover:opacity-100'} transition-opacity`}>
                    {posterImage ? (
                      <div className={`w-full aspect-[3/4] mb-4 rounded-xl overflow-hidden border border-[var(--border-light)] ${hasTrial ? '' : 'grayscale opacity-75'}`}>
                        <img src={posterImage} alt={tool.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border-light)] flex items-center justify-center text-3xl mb-4 ${hasTrial ? '' : 'grayscale'}`}>
                        {tool.icon || '🔒'}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      {tool.version && (
                        <span className="px-2 py-0.5 bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)] font-mono text-[11px] rounded-md font-semibold">
                          {tool.version}
                        </span>
                      )}
                      {updateInfo && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                          updateInfo.isRecent
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-[var(--bg-deep)] border-[var(--border-light)] text-[var(--text-muted)]'
                        }`}>
                          {updateInfo.text}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{tool.name}</h3>
                    <p className="text-[var(--text-secondary)] text-sm mb-4 flex-grow">{tool.description}</p>
                    
                    {hasTrial ? (
                      /* Trial active - เคยทดลองใช้แล้ว */
                      <div className="mt-auto pt-4 border-t border-[var(--border-light)] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400 text-sm font-semibold flex items-center gap-1">🎁 โหมดทดลองใช้ (3 คลิป)</span>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/tool/${tool.slug}?trial=1`} className="flex-1 text-center px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm transition-colors">
                            ▶️ เข้าตัวทดลอง
                          </Link>
                          <Link href={`/checkout/${tool.slug}`} className="puppap-btn-primary px-3 py-2 text-sm">
                            🛒 ซื้อเต็ม
                          </Link>
                        </div>
                      </div>
                    ) : (
                      /* ยังไม่ได้ซื้อ / ยังไม่ได้ทดลอง */
                      <div className="mt-auto pt-4 border-t border-[var(--border-light)] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)] text-sm flex items-center gap-1">🔒 ยังไม่ได้ซื้อ</span>
                          <div className="flex gap-2">
                            <Link href={`/checkout/${tool.slug}`} className="puppap-btn-primary px-3 py-1.5 text-xs">
                              🛒 สั่งซื้อ
                            </Link>
                            <a href="https://m.me/100083126689322" target="_blank" rel="noopener noreferrer" className="puppap-btn-secondary px-3 py-1.5 text-xs">
                              💬 แชท
                            </a>
                          </div>
                        </div>
                        {trialEnabled && (
                          <button
                            onClick={() => startTrial(tool.id)}
                            disabled={startingTrial === tool.id}
                            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
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
        <div className="puppap-card p-6 mt-12 max-w-xl mx-auto relative overflow-hidden">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--accent)]">
            🔑 มีรหัสปลดล็อก?
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="กรอก License Key ของคุณ"
              className="flex-grow bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
            />
            <button
              onClick={handleActivate}
              disabled={!licenseKey}
              className="puppap-btn-primary px-6 py-2 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ปลดล็อก
            </button>
          </div>
          {licenseMsg.text && (
            <p className={`mt-3 text-sm font-semibold ${licenseMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--danger)]'}`}>
              {licenseMsg.text}
            </p>
          )}
        </div>
      </main>
      
      <footer className="text-center mt-20 text-[var(--text-muted)] text-sm pb-8 border-t border-[var(--border-light)] pt-6">
        © 2026 PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม
      </footer>
    </div>
  );
}
