import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  hasMarketingConsent,
  setMarketingConsent,
  getPreviewAbVariant,
  trackPreviewEvent,
} from '@/lib/meta-pixel';

const ROOT = process.cwd();

describe('Lesson 21 ~1-Minute Preview Player & Psychological CRO Suite', () => {
  describe('1. Media Assets & Size Budgets', () => {
    it('has lesson-21-preview.mp4 under 5.5 MB', () => {
      const mp4Path = path.join(ROOT, 'public/videos/lesson-21-preview.mp4');
      expect(fs.existsSync(mp4Path)).toBe(true);
      const stat = fs.statSync(mp4Path);
      expect(stat.size).toBeGreaterThan(500 * 1024); // > 500 KB
      expect(stat.size).toBeLessThan(5.5 * 1024 * 1024); // < 5.5 MB
    });

    it('has lesson-21-preview-poster.webp under 75 KB', () => {
      const posterPath = path.join(ROOT, 'public/images/lesson-21-preview-poster.webp');
      expect(fs.existsSync(posterPath)).toBe(true);
      const stat = fs.statSync(posterPath);
      expect(stat.size).toBeGreaterThan(10 * 1024);
      expect(stat.size).toBeLessThan(75 * 1024); // strictly < 75 KB
    });

    it('has valid Thai WebVTT file synced to ~63s with Cliffhanger Step 1 cue', () => {
      const vttPath = path.join(ROOT, 'public/videos/lesson-21-preview.th.vtt');
      expect(fs.existsSync(vttPath)).toBe(true);
      const content = fs.readFileSync(vttPath, 'utf8');
      expect(content.startsWith('WEBVTT')).toBe(true);
      expect(content).toContain('00:58.630 --> 01:03.180');
      expect(content).toContain('สเต็ปที่หนึ่ง เราจะเปลี่ยนรูปถ่ายจริงให้เป็นตัวละครอนิเมะ 2D กันค่ะ');
    });
  });

  describe('2. Legal & Copy Consistency (Zero "897", Zero "56 วินาที", Consistent ฿598 Bonus)', () => {
    const courseFiles = [
      'src/components/Lesson21PreviewPlayer.tsx',
      'src/components/CoursePosterLightbox.tsx',
      'src/app/courses/CoursesClient.tsx',
      'src/app/page.tsx',
      'src/app/DashboardClient.tsx',
      'src/app/tool/[slug]/ToolGuideClient.tsx',
      'src/app/course/[slug]/CourseStudioClient.tsx',
    ];

    it('contains zero occurrences of "897" or "56 วินาที" across all UI files', () => {
      for (const rel of courseFiles) {
        const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        expect(content, `${rel} must not contain 897`).not.toContain('897');
        expect(content, `${rel} must not contain 56 วินาที`).not.toContain('56 วินาที');
      }
    });

    it('displays compliant "ราคาเปิดตัว" and "฿598" bonus value stack across course pages', () => {
      for (const rel of [
        'src/components/Lesson21PreviewPlayer.tsx',
        'src/app/courses/CoursesClient.tsx',
        'src/app/page.tsx',
        'src/app/DashboardClient.tsx',
      ]) {
        const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        expect(content, `${rel} should include ราคาเปิดตัว`).toContain('ราคาเปิดตัว');
        expect(content, `${rel} should include 598`).toContain('598');
      }
    });
  });

  describe('3. Single Source of Truth Captions, Anti-Scrub & State-Aware CTA', () => {
    const playerSource = fs.readFileSync(
      path.join(ROOT, 'src/components/Lesson21PreviewPlayer.tsx'),
      'utf8'
    );

    it('uses WebVTT track.activeCues as Single Source of Truth without hardcoded SUBTITLE_CUES', () => {
      expect(playerSource).not.toContain('SUBTITLE_CUES');
      expect(playerSource).toContain("track.mode = mutedState ? 'hidden' : 'showing'");
      expect(playerSource).toContain('track.activeCues');
      expect(playerSource).toContain('cuechange');
    });

    it('enforces cumulative watchedSecondsRef anti-scrub guard before firing quartile events', () => {
      expect(playerSource).toContain('watchedSecondsRef');
      expect(playerSource).toContain('if (!video.seeking && delta > 0 && delta < 1.0)');
      expect(playerSource).toContain('watchedRatio >= 0.25');
      expect(playerSource).toContain('watchedSecondsRef.current >= dur * 0.75');
    });

    it('implements State-Aware CTA for enrolled students (hasAccess)', () => {
      expect(playerSource).toContain('hasAccess');
      expect(playerSource).toContain('▶ เรียนต่อบทที่ 21 แบบเต็ม (พร้อม {promptCount} Prompt)');
      expect(playerSource).toContain('▶ เข้าเรียนบทที่ 21 แบบเต็มทันที');
    });
  });

  describe('4. PDPA Network-Level Consent Gate & A/B Persistence', () => {
    const storageMap = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storageMap.set(k, v);
      },
    };

    beforeEach(() => {
      storageMap.clear();
      vi.stubGlobal('localStorage', mockStorage);
      vi.stubGlobal('window', {
        localStorage: mockStorage,
        dispatchEvent: vi.fn(),
        fbq: vi.fn(),
        gtag: vi.fn(),
      });
      vi.stubGlobal('navigator', {
        webdriver: false,
        sendBeacon: vi.fn(() => true),
      });
    });

    it('blocks Meta Pixel and GA4 when PDPA consent is not accepted, while sending first-party beacon', () => {
      expect(hasMarketingConsent()).toBe(false);
      trackPreviewEvent('preview_unmute', { variant: 'A' });

      expect((window as any).fbq).not.toHaveBeenCalled();
      expect((window as any).gtag).not.toHaveBeenCalled();
      expect(navigator.sendBeacon).toHaveBeenCalledWith(
        '/api/track-visit',
        expect.any(Blob)
      );
    });

    it('fires Meta Pixel and GA4 after explicit PDPA acceptance', () => {
      setMarketingConsent(true);
      expect(hasMarketingConsent()).toBe(true);

      trackPreviewEvent('overlay_cta_click', {
        variant: 'A',
        utm_content: 'preview_l21_overlay_A',
      });
      expect((window as any).fbq).toHaveBeenCalledWith(
        'trackCustom',
        'overlay_cta_click',
        { variant: 'A', utm_content: 'preview_l21_overlay_A' }
      );
      expect((window as any).gtag).toHaveBeenCalledWith(
        'event',
        'overlay_cta_click',
        { variant: 'A', utm_content: 'preview_l21_overlay_A' }
      );
    });

    it('persists A/B variant in localStorage across calls', () => {
      const first = getPreviewAbVariant();
      expect(['A', 'B']).toContain(first);
      expect(storageMap.get('puppap_preview_ab')).toBe(first);

      const second = getPreviewAbVariant();
      expect(second).toBe(first);
    });

    it('skips tracking and defaults to variant A for automated bots (navigator.webdriver)', () => {
      vi.stubGlobal('navigator', {
        webdriver: true,
        sendBeacon: vi.fn(() => true),
      });
      setMarketingConsent(true);

      expect(getPreviewAbVariant()).toBe('A');
      trackPreviewEvent('preview_50');
      expect(navigator.sendBeacon).not.toHaveBeenCalled();
      expect((window as any).fbq).not.toHaveBeenCalled();
    });

    it('gates <Script id="fb-pixel-init"> at the network level in MetaPixel.tsx', () => {
      const metaPixelSource = fs.readFileSync(
        path.join(ROOT, 'src/components/MetaPixel.tsx'),
        'utf8'
      );
      expect(metaPixelSource).toContain('const shouldLoadMarketingPixel = Boolean(FB_PIXEL_ID && hasConsent)');
      expect(metaPixelSource).toContain('{shouldLoadMarketingPixel && (');
    });
  });
});
