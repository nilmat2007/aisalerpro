'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ToolGuidePage() {
  const { slug } = useParams();
  const router = useRouter();

  const [tool, setTool] = useState<any>(null);
  const [guideSections, setGuideSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
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
          showError('รหัสผ่านไม่ถูกต้อง');
        }
      } else {
        showError('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
      }
    } catch (err) {
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

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 neon-border ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{tool.icon_emoji}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{tool.name}</h2>
            <p className="text-slate-400 text-sm">กรุณาใส่รหัสผ่านเพื่อเข้าสู่คู่มือ</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
            >
              ยืนยัน
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-slate-500 hover:text-cyan-400 text-sm transition-colors">
              &larr; กลับหน้าหลัก
            </Link>
          </div>
        </div>
        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            50% { transform: translateX(10px); }
            75% { transform: translateX(-10px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-cyan-400 mb-6 transition-colors text-sm">
            &larr; กลับหน้าหลัก
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl border border-slate-700 shadow-lg">
              {tool.icon_emoji}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                {tool.name}
              </h1>
              <p className="text-slate-400">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
        {guideSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="flex space-x-2 mb-4">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p>กำลังเตรียมเนื้อหา...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {guideSections.map((section: any, idx: number) => (
              <div key={section.id || idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 neon-border">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="text-2xl">{section.icon_emoji || '📌'}</span>
                  {section.title}
                </h2>

                <div className="space-y-8">
                  {section.steps?.map((step: any, stepIdx: number) => (
                    <div key={step.id || stepIdx} className="relative pl-10 md:pl-12">
                      {/* Step Number Circle */}
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
                        {stepIdx + 1}
                      </div>

                      <div className="text-slate-200 leading-relaxed mb-4 whitespace-pre-line">
                        {step.content}
                      </div>

                      {/* Sub Items */}
                      {step.sub_items && step.sub_items.length > 0 && (
                        <ul className="space-y-2 mb-4 pl-2">
                          {step.sub_items.map((item: string, i: number) => (
                            <li key={i} className="flex items-start text-slate-300">
                              <span className="text-cyan-500 mr-2 mt-1">▸</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Step Image */}
                      {step.image_url && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                          <img src={step.image_url} alt={`Step ${stepIdx + 1}`} className="w-full h-auto object-contain max-h-[500px]" />
                          {step.image_caption && (
                            <div className="text-center py-2 bg-slate-900 text-slate-500 text-sm border-t border-slate-800">
                              {step.image_caption}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
