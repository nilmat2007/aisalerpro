'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getConsentStatus, setMarketingConsent } from '@/lib/meta-pixel';

export default function PdpaConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const status = getConsentStatus();
    if (status === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleChoice = (accepted: boolean) => {
    setMarketingConsent(accepted);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="การตั้งค่าคุกกี้และความเป็นส่วนตัว (PDPA)"
      className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-50 puppap-card p-3.5 sm:p-4 border-2 border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-md shadow-2xl animate-fade-in"
    >
      <div className="space-y-2.5">
        <div className="flex items-start gap-2.5">
          <span className="text-lg shrink-0" aria-hidden="true">
            🍪
          </span>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            เว็บไซต์นี้ใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งานและวัดผลโฆษณาตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA){' '}
            <Link
              href="/privacy"
              className="text-[var(--accent)] font-bold underline hover:opacity-80"
            >
              อ่านนโยบายความเป็นส่วนตัว
            </Link>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleChoice(false)}
            className="puppap-btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            เฉพาะคุกกี้ที่จำเป็น
          </button>
          <button
            type="button"
            onClick={() => handleChoice(true)}
            className="puppap-btn-primary px-3.5 py-1.5 text-xs font-bold cursor-pointer shadow-xs"
          >
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
