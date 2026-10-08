'use client';

import React from 'react';
import Link from 'next/link';

interface FlowToolCardProps {
  tool: any;
  hasAccess?: boolean;
  hasTrial?: boolean;
  onStartTrial?: (toolId: string) => void;
  isStartingTrial?: boolean;
}

export default function FlowToolCard({
  tool,
  hasAccess = false,
  hasTrial = false,
  onStartTrial,
  isStartingTrial = false,
}: FlowToolCardProps) {
  // Parse features metadata
  const feat = (typeof tool.features === 'object' && tool.features !== null && !Array.isArray(tool.features))
    ? tool.features
    : {};

  const modelsUsed = Array.isArray(feat.models_used) ? feat.models_used : [];
  const tags = Array.isArray(feat.tags) ? feat.tags : [];
  const tierRequired = feat.tier_required || 'pro';
  const category = feat.category || 'video';

  const posterImg = tool.poster_url || null;
  const logoImg = tool.logo_url || null;
  const version = tool.version || 'v1.0.0';
  const badgeText = tool.badge_text || null;
  const trialAvailable = tool.trial_enabled && Boolean(tool.trial_flow_url);

  // Helper for tier badge text
  const getTierLabel = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'vip':
        return { label: 'PUP VIP', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'starter':
        return { label: 'PUP Starter', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'pro':
      default:
        return { label: 'PUP Pro', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]' };
    }
  };

  const tierInfo = getTierLabel(tierRequired);

  return (
    <div className={`puppap-card overflow-hidden flex flex-col h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
      hasAccess ? 'border-emerald-500/50' : ''
    }`}>
      {/* 16:10 Aspect Ratio Cover Poster */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-900 border-b border-[var(--border-light)] group">
        {posterImg ? (
          <img
            src={posterImg}
            alt={tool.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-deep)]">
            <span className="text-4xl">{tool.icon || '🎬'}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 flex-wrap">
          {badgeText && (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[var(--accent)] text-white shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              {badgeText}
            </span>
          )}
          {hasAccess && (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-600 text-white shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              ปลดล็อกแล้ว
            </span>
          )}
        </div>

        {/* Top Right Tier Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border ${tierInfo.color} shadow-sm bg-white/90 dark:bg-black/80`}>
            {hasAccess ? (
              <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            {tierInfo.label}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* App Logo & Title Row */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-[var(--border)] bg-white shadow-sm flex items-center justify-center">
            {logoImg ? (
              <img src={logoImg} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{tool.icon || '⚡'}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[var(--text-primary)] truncate" title={tool.name}>
                {tool.name}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-deep)] border border-[var(--border-light)] text-[11px] font-mono font-bold text-[var(--accent)] shrink-0">
                {version}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
              หมวด: <span className="font-semibold text-[var(--text-secondary)] uppercase">{category}</span>
            </p>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 mb-3 leading-relaxed flex-grow">
          {tool.description || 'เครื่องมือสร้างสรรค์วิดีโอ AI อัตโนมัติ คิดปุ๊บ คลิปปั๊บ'}
        </p>

        {/* AI Model Badges (airefills style) */}
        {modelsUsed.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3" aria-label="โมเดล AI ที่ใช้">
            {modelsUsed.map((m: any, idx: number) => {
              const isVideo = m.type === 'video';
              return (
                <span
                  key={idx}
                  title={`${isVideo ? 'โมเดลวิดีโอ' : 'โมเดลภาพ'}: ${m.name}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                    isVideo
                      ? 'bg-indigo-950/80 text-indigo-100 border-indigo-700/50 dark:bg-indigo-950 dark:text-indigo-200'
                      : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isVideo ? (
                    <svg className="w-3 h-3 text-indigo-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
                      <path d="m6.2 5.3 3.1 3.9" />
                      <path d="m12.4 3.4 3.1 4" />
                      <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  )}
                  <span className="truncate max-w-[140px] sm:max-w-[170px]">{m.name}</span>
                  {m.customizable && (
                    <svg className="w-2.5 h-2.5 opacity-60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="21" x2="14" y1="4" y2="4" />
                      <line x1="10" x2="3" y1="4" y2="4" />
                      <line x1="21" x2="12" y1="12" y2="12" />
                      <line x1="8" x2="3" y1="12" y2="12" />
                      <line x1="21" x2="16" y1="20" y2="20" />
                      <line x1="12" x2="3" y1="20" y2="20" />
                    </svg>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Feature Tags (Chips) */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {tags.slice(0, 4).map((tag: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-deep)] border border-[var(--border-light)] text-[10.5px] font-medium text-[var(--text-muted)]"
              >
                <span className="text-[var(--accent)]">#</span>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t border-[var(--border-light)] flex items-center gap-2">
          {/* Info Button */}
          <Link
            href={`/tool/${tool.slug}`}
            title="ดูข้อมูลคู่มือและรายละเอียด"
            className="puppap-btn-secondary h-10 px-3.5 flex items-center justify-center text-xs shrink-0 hover:scale-105 transition-transform"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </Link>

          {/* Primary Action Button */}
          {hasAccess ? (
            tool.flow_url ? (
              <a
                href={tool.flow_url}
                target="_blank"
                rel="noopener noreferrer"
                className="puppap-btn-primary flex-1 h-10 px-4 text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>🚀 เปิดใช้ Flow Tool</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ) : (
              <Link
                href={`/tool/${tool.slug}`}
                className="puppap-btn-primary flex-1 h-10 px-4 text-xs sm:text-sm flex items-center justify-center gap-1.5"
              >
                <span>เข้าใช้งาน</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            )
          ) : hasTrial ? (
            <div className="flex-1 flex gap-2">
              <Link
                href={`/tool/${tool.slug}?trial=1`}
                className="flex-1 h-10 px-3 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-sm transition-colors text-center"
              >
                <span>▶️ ตัวทดลอง (3 คลิป)</span>
              </Link>
              <Link
                href={`/checkout/${tool.slug}`}
                className="puppap-btn-primary px-3 h-10 text-xs sm:text-sm flex items-center justify-center shadow-sm"
              >
                <span>🛒 สั่งซื้อ</span>
              </Link>
            </div>
          ) : trialAvailable && onStartTrial ? (
            <button
              onClick={() => onStartTrial(tool.id)}
              disabled={isStartingTrial}
              className="flex-1 h-10 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-emerald-700 shadow-md transition-colors disabled:opacity-50"
            >
              <span>{isStartingTrial ? '⏳ กำลังเปิด...' : '🎁 ทดลองฟรี 3 คลิป'}</span>
            </button>
          ) : (
            <Link
              href={`/checkout/${tool.slug}`}
              className="puppap-btn-primary flex-1 h-10 px-4 text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>🔒 ปลดล็อกเครื่องมือ</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
