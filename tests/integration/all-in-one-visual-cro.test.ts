import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_IN_ONE_TOOL_ID,
  DEFAULT_SHOWCASE_TOOLS,
  getAllInOnePricing,
  getShortVisualTitle,
  isAllInOnePackageRow,
} from '@/lib/all-in-one-pricing';
import { isFloatingPromoExcludedPath } from '@/components/FloatingPromoWidget';
import { ALL_IN_ONE_SLUG } from '@/lib/course-bundle';
import { mergePreservedSensitiveToolFields } from '@/lib/sanitize-tool';

const ROOT = process.cwd();

describe('All-in-One ฿799 HTML Visual Layer & Global Floating Promo Suite', () => {
  describe('1. DEFAULT_SHOWCASE_TOOLS DB Sync & Zero Dead Fields', () => {
    it('matches the exact 8 eligible active slugs in public.tools with zero dead original_price fields', () => {
      const slugs = DEFAULT_SHOWCASE_TOOLS.map((t) => t.slug);
      expect(slugs).toEqual([
        'tiktok-ai-affiliate',
        'ugc-batch',
        'ai-content-factory',
        'puppap-fashion-studio',
        'puppap-ugc-product',
        'pup-podcast-studio',
        'pup-pap-banana-ai-studio',
        'pup-pap-storypro',
      ]);

      for (const tool of DEFAULT_SHOWCASE_TOOLS) {
        expect(tool.features?.original_price).toBeUndefined();
      }
    });

    it('formats short visual titles cleanly and strips brand prefixes for future tools', () => {
      expect(getShortVisualTitle({ slug: 'tiktok-ai-affiliate', name: 'คอร์ส' })).toBe(
        'คอร์สเรียน 22 บท'
      );
      expect(getShortVisualTitle({ slug: 'pup-podcast-studio', name: 'Podcast' })).toBe(
        'พอดแคสต์ เล่าเรื่อง'
      );
      expect(getShortVisualTitle({ slug: 'pup-pap-storypro', name: 'StoryPro' })).toBe(
        'ละครสั้น ซีรีส์'
      );
      expect(
        getShortVisualTitle({
          slug: 'puppap-future-2027',
          name: 'PUP PAP AI Super Voice Cloning Studio',
        })
      ).toBe('Super Voice Clonin');
      expect(
        getShortVisualTitle({
          slug: 'puppap-custom-short',
          name: 'Long Name',
          features: { short_title: 'พากย์เสียง AI' },
        })
      ).toBe('พากย์เสียง AI');
    });
  });

  describe('2. getAllInOnePricing() Dynamic Math, DB Package Price & Empty Guard', () => {
    it('computes exact standalone sum (฿2,553), packagePrice (฿799), savings (฿1,754 / 69%), unitCostAvg (฿100), and courseBonusToolsValue (฿598)', () => {
      const p = getAllInOnePricing();
      expect(p.isEmpty).toBe(false);
      expect(p.itemCount).toBe(8);
      expect(p.toolOnlyCount).toBe(7);
      expect(p.packagePrice).toBe(799);
      expect(p.packagePriceFormatted).toBe('799');

      // 159 + 699 + 299 + 299 + 299 + 499 + 0 + 299 = 2553
      expect(p.totalSeparateValue).toBe(2553);
      expect(p.totalSeparateFormatted).toBe('2,553');
      expect(p.savingsAmount).toBe(2553 - 799); // 1754
      expect(p.savingsFormatted).toBe('1,754');
      expect(p.discountPercent).toBe(Math.round((1754 / 2553) * 100)); // 69
      expect(p.unitCostAvg).toBe(Math.round(799 / 8)); // 100
      expect(p.coursePrice).toBe(159);
      expect(p.courseBonusToolsValue).toBe(598);
      expect(p.courseBonusToolsFormatted).toBe('598');

      // Free tool (0 บาท) displays "ฟรีในแพ็ก"
      const bananaItem = p.items.find((it) => it.slug === 'pup-pap-banana-ai-studio');
      expect(bananaItem?.standalonePrice).toBe(0);
      expect(bananaItem?.priceLabel).toBe('ฟรีในแพ็ก');
    });

    it('dynamically resolves packagePrice from the puppap-all-in-one row (or bundle ID/category) in rawTools', () => {
      const toolsWith1299Package = [
        {
          id: 'pkg-row',
          slug: ALL_IN_ONE_SLUG,
          name: 'แพ็กเหมาๆ',
          price: '1299 บาท',
          is_active: true,
          is_coming_soon: false,
        },
        ...DEFAULT_SHOWCASE_TOOLS,
      ];

      const p = getAllInOnePricing(toolsWith1299Package, 'puppap-fashion-studio');
      expect(p.packagePrice).toBe(1299);
      expect(p.packagePriceFormatted).toBe('1,299');
      expect(p.savingsAmount).toBe(2553 - 1299); // 1254
      expect(p.upgradeDiffAmount).toBe(1299 - 299); // 1000

      // Defense-in-depth: even if slug was corrupted to "-799-ai-", it recognizes the package row and filters it out of items
      expect(
        isAllInOnePackageRow({
          id: ALL_IN_ONE_TOOL_ID,
          slug: '-799-ai-',
          price: '799 บาท',
          features: { category: 'bundle' },
        })
      ).toBe(true);
    });

    it('prevents mergePreservedSensitiveToolFields from ever corrupting system slugs to "-799-ai-"', () => {
      const existingAllInOne = {
        id: ALL_IN_ONE_TOOL_ID,
        slug: 'puppap-all-in-one',
        name: 'แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ 999',
      };
      const merged = mergePreservedSensitiveToolFields(existingAllInOne, {
        name: 'แพ็กเกจเหมาๆ ปุ๊บ ปั๊บ 799 (ปลดล็อกครบคอร์สเรียน + เครื่องมือ AI ทั้งหมด)',
        slug: '-799-ai-',
        price: '799 บาท',
      });
      expect(merged.slug).toBe('puppap-all-in-one');
      expect(merged.price).toBe('799 บาท');
    });

    it('dynamically expands when a 9th tool is added and excludes tools with exclude_from_all_in_one: true', () => {
      const toolsWith9thAndExcluded = [
        ...DEFAULT_SHOWCASE_TOOLS,
        {
          id: 'tool-9',
          slug: 'puppap-voice-clone',
          name: 'PUP PAP Voice Clone',
          price: '399 บาท',
          is_active: true,
          is_coming_soon: false,
        },
        {
          id: 'tool-excluded',
          slug: 'puppap-enterprise-only',
          name: 'Enterprise Tool',
          price: '1990 บาท',
          is_active: true,
          is_coming_soon: false,
          features: { exclude_from_all_in_one: true },
        },
      ];

      const p = getAllInOnePricing(toolsWith9thAndExcluded, 'puppap-enterprise-only');
      expect(p.itemCount).toBe(9);
      expect(p.toolOnlyCount).toBe(8);
      expect(p.totalSeparateValue).toBe(2553 + 399); // 2952
      expect(p.savingsAmount).toBe(2952 - 799); // 2153
      // Excluded tool must not be marked eligible
      expect(p.isCurrentToolEligible).toBe(false);
      expect(p.currentItem).toBeNull();
      expect(p.currentItemIndex).toBe(-1);
      expect(p.upgradeDiffAmount).toBe(0);
    });

    it('returns isEmpty = true and safe zeros when rawTools is empty or all tools are excluded', () => {
      const emptyPricing = getAllInOnePricing([]);
      expect(emptyPricing.isEmpty).toBe(true);
      expect(emptyPricing.itemCount).toBe(0);
      expect(emptyPricing.totalSeparateValue).toBe(0);
      expect(emptyPricing.savingsAmount).toBe(0);
      expect(emptyPricing.discountPercent).toBe(0);
      expect(emptyPricing.unitCostAvg).toBe(0);
      expect(emptyPricing.shouldUseDiffFraming).toBe(false);
    });
  });

  describe('3. Boundary Tests for shouldUseDiffFraming (price >= 250 && diff <= 750)', () => {
    const makeSingleToolList = (price: number, pkgPrice = 999) => [
      {
        id: 'pkg',
        slug: ALL_IN_ONE_SLUG,
        name: 'Package',
        price: String(pkgPrice),
        is_active: true,
        is_coming_soon: false,
      },
      {
        id: 't1',
        slug: 'test-tool',
        name: 'Test Tool',
        price: String(price),
        is_active: true,
        is_coming_soon: false,
      },
    ];

    it('Case 1: price = 159 (course), pkg = 799 (diff = 640) -> shouldUseDiffFraming = false (below 250 floor)', () => {
      const p = getAllInOnePricing(DEFAULT_SHOWCASE_TOOLS, 'tiktok-ai-affiliate');
      expect(p.currentItem?.standalonePrice).toBe(159);
      expect(p.upgradeDiffAmount).toBe(640);
      expect(p.shouldUseDiffFraming).toBe(false);
    });

    it('Case 2: price = 249, pkg = 999 (diff = 750) -> shouldUseDiffFraming = false (below 250 floor)', () => {
      const p = getAllInOnePricing(makeSingleToolList(249, 999), 'test-tool');
      expect(p.upgradeDiffAmount).toBe(750);
      expect(p.shouldUseDiffFraming).toBe(false);
    });

    it('Case 3: price = 250, pkg = 999 (diff = 749) -> shouldUseDiffFraming = true', () => {
      const p = getAllInOnePricing(makeSingleToolList(250, 999), 'test-tool');
      expect(p.upgradeDiffAmount).toBe(749);
      expect(p.shouldUseDiffFraming).toBe(true);
    });

    it('Case 4: price = 250, pkg = 1000 (diff = 750 exact boundary) -> shouldUseDiffFraming = true', () => {
      const p = getAllInOnePricing(makeSingleToolList(250, 1000), 'test-tool');
      expect(p.upgradeDiffAmount).toBe(750);
      expect(p.shouldUseDiffFraming).toBe(true);
    });

    it('Case 5: price = 250, pkg = 1001 (diff = 751 exceeds ceiling) -> shouldUseDiffFraming = false', () => {
      const p = getAllInOnePricing(makeSingleToolList(250, 1001), 'test-tool');
      expect(p.upgradeDiffAmount).toBe(751);
      expect(p.shouldUseDiffFraming).toBe(false);
    });

    it('Case 6: price = 299 (diff = 500 at pkg 799) and price = 699 (diff = 100 at pkg 799) -> shouldUseDiffFraming = true', () => {
      const p299 = getAllInOnePricing(DEFAULT_SHOWCASE_TOOLS, 'puppap-fashion-studio');
      expect(p299.upgradeDiffAmount).toBe(500);
      expect(p299.shouldUseDiffFraming).toBe(true);

      const p699 = getAllInOnePricing(DEFAULT_SHOWCASE_TOOLS, 'ugc-batch');
      expect(p699.upgradeDiffAmount).toBe(100);
      expect(p699.shouldUseDiffFraming).toBe(true);
    });

    it('Case 7: price = 0 (free tool, diff = 799) -> shouldUseDiffFraming = false', () => {
      const pFree = getAllInOnePricing(DEFAULT_SHOWCASE_TOOLS, 'pup-pap-banana-ai-studio');
      expect(pFree.upgradeDiffAmount).toBe(799);
      expect(pFree.shouldUseDiffFraming).toBe(false);
    });
  });

  describe('4. FloatingPromoWidget Path Exclusion & Accessibility Contracts', () => {
    it('excludes /admin/*, /login, /auth/*, and /checkout/* while allowing public & member pages', () => {
      expect(isFloatingPromoExcludedPath('/admin')).toBe(true);
      expect(isFloatingPromoExcludedPath('/admin/tools')).toBe(true);
      expect(isFloatingPromoExcludedPath('/login')).toBe(true);
      expect(isFloatingPromoExcludedPath('/auth/callback')).toBe(true);
      expect(isFloatingPromoExcludedPath('/checkout/puppap-all-in-one')).toBe(true);
      expect(isFloatingPromoExcludedPath('/checkout/ugc-batch')).toBe(true);

      expect(isFloatingPromoExcludedPath('/')).toBe(false);
      expect(isFloatingPromoExcludedPath('/store')).toBe(false);
      expect(isFloatingPromoExcludedPath('/flow-tools')).toBe(false);
      expect(isFloatingPromoExcludedPath('/courses')).toBe(false);
      expect(isFloatingPromoExcludedPath('/tool/ugc-batch')).toBe(false);
    });

    it('verifies AllInOneToolGrid, AllInOneUpsellBanner, FloatingPromoWidget, and RootLayout contracts', () => {
      const gridSource = fs.readFileSync(
        path.join(ROOT, 'src/components/AllInOneToolGrid.tsx'),
        'utf8'
      );
      expect(gridSource).toContain('data-testid={`tool-slot-${idx + 1}`}');
      expect(gridSource).toContain('data-testid={`tool-thumb-${idx + 1}`}');
      expect(gridSource).toContain('data-testid="current-tool-badge"');
      expect(gridSource).toContain('data-testid="grid-dynamic-item-count"');
      expect(gridSource).toContain('grid-cols-7');
      expect(gridSource).toContain('อัปเดตและเติมโปรแกรม AI ใหม่ให้ฟรี');
      expect(gridSource).toContain('ตลอดชีพ');
      expect(gridSource).toContain('ตัวนี้');
      expect(gridSource).toContain('loading="lazy"');
      expect(gridSource).toContain('decoding="async"');

      const bannerSource = fs.readFileSync(
        path.join(ROOT, 'src/components/AllInOneUpsellBanner.tsx'),
        'utf8'
      );
      expect(bannerSource).toContain('data-testid="poster-tool-count-badge"');
      expect(bannerSource).toContain('{pricing.toolOnlyCount} โปรแกรม AI');
      expect(bannerSource).toContain('รวม {pricing.itemCount} รายการ!');

      const widgetSource = fs.readFileSync(
        path.join(ROOT, 'src/components/FloatingPromoWidget.tsx'),
        'utf8'
      );
      expect(widgetSource).toContain('role="dialog"');
      expect(widgetSource).toContain('aria-modal="true"');
      expect(widgetSource).toContain('aria-labelledby="promo-modal-title"');
      expect(widgetSource).toContain('id="promo-modal-title"');
      expect(widgetSource).toContain('tabIndex={-1}');
      expect(widgetSource).toContain('headingRef.current?.focus()');
      expect(widgetSource).toContain("e.key === 'Escape'");
      expect(widgetSource).toContain("e.key === 'Tab'");
      expect(widgetSource).toContain('min-w-[44px] min-h-[44px]');
      expect(widgetSource).toContain('safe-area-inset-bottom');
      expect(widgetSource).toContain('pricing.courseBonusToolsFormatted');

      const loaderSource = fs.readFileSync(
        path.join(ROOT, 'src/components/FloatingPromoWidgetLoader.tsx'),
        'utf8'
      );
      expect(loaderSource).toContain('ssr: false');

      const layoutSource = fs.readFileSync(
        path.join(ROOT, 'src/app/layout.tsx'),
        'utf8'
      );
      expect(layoutSource).toContain('<FloatingPromoWidgetLoader />');

      const globalsCssSource = fs.readFileSync(
        path.join(ROOT, 'src/app/globals.css'),
        'utf8'
      );
      expect(globalsCssSource).toContain(
        '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));'
      );
    });
  });
});
