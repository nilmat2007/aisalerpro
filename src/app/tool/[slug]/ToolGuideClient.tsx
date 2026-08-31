'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ToolGuideClient({ slug, hasAccess, loggedIn }: { slug: string, hasAccess: boolean, loggedIn: boolean }) {
  const router = useRouter();

  const [tool, setTool] = useState<any>(null);
  const [guideSections, setGuideSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(hasAccess);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/tools`);
        if (!res.ok) throw new Error('Failed to fetch tools');
        const tools = await res.json();
        const currentTool = tools.find((t: any) => t.slug === slug);
        
        if (!currentTool) {
          router.push('/');
          return;
        }
        setTool(currentTool);

        const guideRes = await fetch(`/api/guide/${currentTool.id}`);
        if (guideRes.ok) {
          const guides = await guideRes.json();
          setGuideSections(guides);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (slug) {
      fetchData();
    }
  }, [slug, router]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: tool.id, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsUnlocked(true);
          setError('');
        } else {
          showError('❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
        }
      } else {
        showError('❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
      }
    } catch {
      showError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const showError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  if (!tool) return null;

  // ===== LOGIN SCREEN =====
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
        <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full mx-4 relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] text-center ${isShaking ? 'animate-shake' : ''}`}>
          {/* BG Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex flex-col items-center">
            {tool.logo_url ? (
              <img src={tool.logo_url} alt={tool.name} className="w-24 h-24 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-5" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-4xl mb-5">
                {tool.icon}
              </div>
            )}

            <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              {tool.name}
            </h2>
            <p className="text-slate-400 text-sm mb-6">กรุณาใส่รหัสผ่านเพื่อเข้าสู่คู่มือสำหรับ VIP</p>

            <form onSubmit={handleUnlock} className="w-full space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Access Code"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-white font-mono tracking-widest focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all"
                autoFocus
              />
              
              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all transform hover:scale-105 active:scale-95"
              >
                เข้าสู่ระบบ
              </button>
            </form>

            {!loggedIn && (
              <div className="mt-6 border-t border-slate-800 pt-4 w-full">
                <p className="text-slate-400 text-sm mb-3">หรือ เข้าสู่ระบบด้วย Google เพื่อใช้งานสะดวกกว่า</p>
                <Link href="/login" className="block w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl transition-colors">
                  เข้าสู่ระบบ
                </Link>
              </div>
            )}

            <Link href="/" className="mt-6 text-slate-500 hover:text-cyan-400 text-sm transition-colors inline-block">
              ← กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN GUIDE CONTENT =====
  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="text-center pt-16 pb-12 px-4 flex flex-col items-center">
        {tool.logo_url ? (
          <img src={tool.logo_url} alt={tool.name} className="w-28 h-28 rounded-full object-cover border-2 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:scale-105 transition-transform duration-300 mb-6" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-5xl mb-6">
            {tool.icon}
          </div>
        )}
        
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500" style={{ textShadow: '0 0 10px rgba(6,182,212,0.7), 0 0 20px rgba(6,182,212,0.5)' }}>
          {tool.name}
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          {tool.description}
        </p>
        <div className="mt-4 inline-block bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-1 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.2)]">
          ⭐ Exclusive for VIP Members
        </div>
      </header>

      {/* Guide Sections */}
      <main className="max-w-3xl mx-auto px-4 space-y-8">
        {guideSections.map((section: any, idx: number) => {
          const isVideo = section.style_variant === 'video';
          const isHighlight = section.style_variant === 'highlight';
          const isTip = section.style_variant === 'tip';

          // Video Section
          if (isVideo && section.steps?.[0]?.code_block) {
            return (
              <div key={section.id || idx} className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 md:p-8 neon-border relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <span className="text-3xl">{section.icon}</span> {section.title}
                </h2>
                <div className="w-full max-w-[320px] relative rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)] border-2 border-slate-700 hover:border-cyan-400 transition-colors duration-500">
                  <div className="relative w-full" style={{ paddingTop: '177.77%' }}>
                    <iframe
                      src={`${section.steps[0].code_block}?rel=0&modestbranding=1`}
                      className="absolute top-0 left-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
                {section.description && (
                  <p className="text-cyan-400 text-sm mt-6 text-center bg-cyan-950/30 px-5 py-2.5 rounded-full border border-cyan-900/50">
                    💡 {section.description}
                  </p>
                )}
              </div>
            );
          }

          // Highlight Section (Phase 4 style or Tip)
          const sectionClasses = isHighlight
            ? 'bg-gradient-to-b from-slate-900 to-slate-800 border border-cyan-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]'
            : isTip
            ? 'bg-gradient-to-b from-slate-900 to-slate-800 border border-yellow-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_20px_rgba(234,179,8,0.1)]'
            : 'bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 neon-border relative overflow-hidden';

          return (
            <div key={section.id || idx} className={sectionClasses}>
              {!isHighlight && !isTip && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              )}
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <span className="text-3xl">{section.icon}</span> {section.title}
              </h2>
              {section.description && (
                <p className="text-slate-400 text-sm mb-6">{section.description}</p>
              )}
              <div className="space-y-4 text-slate-300">
                {section.steps?.map((step: any, stepIdx: number) => (
                  <div key={step.id || stepIdx}>
                    <div className="flex gap-4 items-start">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-cyan-400 ${isHighlight ? 'bg-cyan-900' : 'bg-slate-800'}`}>
                        {step.step_number || stepIdx + 1}
                      </div>
                      <div className="pt-1 w-full">
                        {step.title && <p className="mb-1"><strong>{step.title}:</strong> {step.content}</p>}
                        {!step.title && <p>{step.content}</p>}

                        {/* Sub Items */}
                        {step.sub_items && step.sub_items.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm text-slate-400">
                            {step.sub_items.map((item: string, i: number) => (
                              <li key={i} className="flex items-start">
                                <span className="text-cyan-500 mr-2 mt-0.5">▸</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Code Block (Tool Link) */}
                        {step.code_block && !isVideo && (
                          <div className="bg-slate-950 p-3 rounded-lg mt-2 text-sm text-slate-400 break-all border border-slate-800">
                            <a href={step.code_block} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                              {step.code_block}
                            </a>
                          </div>
                        )}

                        {/* Images */}
                        {step.image_urls && step.image_urls.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {step.image_urls.map((url: string, i: number) => (
                              <div key={i} className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                                <img src={url} alt={`Step ${step.step_number}`} className="w-full h-auto object-contain" />
                              </div>
                            ))}
                            {step.image_caption && (
                              <p className="text-center text-slate-500 text-sm">📸 {step.image_caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="text-center text-sm text-slate-500 mt-8">
          สงวนสิทธิ์การใช้งานสำหรับ VIP เท่านั้น
        </div>
      </main>

      <footer className="text-center mt-12 text-slate-500 text-sm">
        <Link href="/" className="text-cyan-500 hover:underline mr-4">← กลับหน้าหลัก</Link>
        © 2026 {tool.name} - {tool.version || 'v1.0'}
      </footer>
    </div>
  );
}
