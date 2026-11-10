import { getPriceInfo } from '@/lib/price-utils';

export const COURSE_BUNDLE_SLUGS = [
  'tiktok-ai-affiliate',
  'puppap-fashion-studio',
  'puppap-ugc-product',
] as const;

export const COURSE_BUNDLE_BONUS_TOOL_SLUGS = [
  'puppap-fashion-studio',
  'puppap-ugc-product',
] as const;

export const ALL_IN_ONE_SLUG = 'puppap-all-in-one' as const;

export const EXCLUDED_FROM_ALL_IN_ONE_SLUGS: readonly string[] = [];

export type CourseBundleSlug = (typeof COURSE_BUNDLE_SLUGS)[number];

export function isCourseBundleSlug(slug?: string | null): slug is CourseBundleSlug {
  if (!slug) return false;
  return (COURSE_BUNDLE_SLUGS as readonly string[]).includes(slug);
}

export function isAllInOneSlug(slug?: string | null): boolean {
  if (!slug) return false;
  return slug === ALL_IN_ONE_SLUG;
}

export function isToolEligibleForAllInOne(
  tool:
    | {
        id?: string | null;
        slug?: string | null;
        is_active?: boolean | null;
        is_coming_soon?: boolean | null;
        features?: any;
      }
    | null
    | undefined
): boolean {
  if (!tool || !tool.slug) return false;
  if (tool.is_active === false) return false;
  if (
    tool.is_coming_soon === true &&
    tool.slug !== 'tiktok-ai-affiliate' &&
    tool.slug !== ALL_IN_ONE_SLUG
  ) {
    return false;
  }
  if ((EXCLUDED_FROM_ALL_IN_ONE_SLUGS as readonly string[]).includes(tool.slug)) {
    return false;
  }
  const feat =
    tool.features && typeof tool.features === 'object' && !Array.isArray(tool.features)
      ? tool.features
      : null;
  if (feat?.exclude_from_all_in_one === true) {
    return false;
  }
  return true;
}

export interface ShowcaseToolItem {
  id: string;
  slug: string;
  name: string;
  shortTitle: string;
  icon: string;
  posterUrl: string | null;
  logoUrl: string | null;
  standalonePrice: number;
  priceLabel: string; // เช่น "฿699", "฿299", หรือ "ฟรีในแพ็ก" เมื่อ standalonePrice === 0
  isCourse: boolean;
}

export interface AllInOnePricingSummary {
  isEmpty: boolean;                // true เมื่อ itemCount === 0 (caller จะ return null ทันที)
  items: ShowcaseToolItem[];
  itemCount: number;               // จำนวนรายการทั้งหมดในแพ็ก (เช่น 7)
  toolOnlyCount: number;           // จำนวนโปรแกรม AI ไม่รวมคอร์ส (เช่น 6)
  packagePrice: number;            // ดึงสดจากแถว puppap-all-in-one ใน rawTools (fallback 999)
  packagePriceFormatted: string;   // เช่น "999"
  totalSeparateValue: number;      // ผลรวม standalonePrice จริงของทุกรายการ (เช่น 2,054)
  totalSeparateFormatted: string;  // เช่น "2,054"
  savingsAmount: number;           // Math.max(0, totalSeparateValue - packagePrice) (เช่น 1,055)
  savingsFormatted: string;        // เช่น "1,055"
  discountPercent: number;         // คำนวณสดจาก Math.round((savingsAmount / totalSeparateValue) * 100)
  unitCostAvg: number;             // Math.round(packagePrice / Math.max(1, itemCount)) (เช่น 143)
  coursePrice: number;             // ราคาขายจริงของคอร์สจากรายการ (เช่น 159)
  coursePriceFormatted: string;    // เช่น "159"
  courseBonusToolsValue: number;   // ผลรวม standalonePrice ของ COURSE_BUNDLE_BONUS_TOOL_SLUGS (เช่น 299 + 299 = 598)
  courseBonusToolsFormatted: string; // เช่น "598"
  currentItem: ShowcaseToolItem | null;
  currentItemIndex: number;        // 0-based index (-1 ถ้าไม่ได้อยู่ในแพ็กหรือถูก exclude)
  isCurrentToolEligible: boolean;  // false ถ้าไม่อยู่ในแพ็กหรือตั้งค่า exclude_from_all_in_one = true
  upgradeDiffAmount: number;       // 0 ถ้า currentItem === null, มิฉะนั้น Math.max(0, packagePrice - currentItem.standalonePrice)
  upgradeDiffFormatted: string;    // เช่น "700" หรือ "300"
  shouldUseDiffFraming: boolean;   // true เฉพาะเมื่อ currentItem.standalonePrice >= 250 && upgradeDiffAmount <= 750
}

const SHORT_TITLE_MAP: Record<string, string> = {
  'tiktok-ai-affiliate': 'คอร์สเรียน 22 บท',
  'ugc-batch': 'คลิปรีวิวขายดุ',
  'ai-content-factory': 'โรงงานผลิตคลิป',
  'puppap-fashion-studio': 'แฟชั่น & นายแบบ',
  'puppap-ugc-product': 'คลิปปักตะกร้า',
  'pup-pap-banana-ai-studio': 'โชว์ใช้สินค้า',
  'pup-pap-storypro': 'ละครสั้น ซีรีส์',
};

// ตรงกับข้อมูลจริงในตาราง public.tools บน Supabase 100% (ไม่มี dead features.original_price)
export const DEFAULT_SHOWCASE_TOOLS: any[] = [
  {
    id: 'default-course',
    slug: 'tiktok-ai-affiliate',
    name: 'คอร์สนายหน้า TikTok ด้วย AI ปักตะกร้า (22 บทเรียน)',
    icon: '🎓',
    poster_url: 'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/poster_1793932273836.png',
    logo_url: '/images/logo-puppap-ai.png',
    price: '159 บาท',
    category: 'course',
    is_active: true,
    is_coming_soon: false,
    sort_order: 10,
  },
  {
    id: 'default-ugc-batch',
    slug: 'ugc-batch',
    name: 'Ai SALER PRO - UGC Batch',
    icon: '🎬',
    poster_url: 'https://lh3.googleusercontent.com/d/1RAulUn2FpSIjMSJca3l2qLKWqhEM8cfT',
    logo_url: '/images/logo-ugc-batch.jpg',
    price: '699 บาท',
    is_active: true,
    is_coming_soon: false,
    sort_order: 1,
  },
  {
    id: 'default-content-factory',
    slug: 'ai-content-factory',
    name: 'AI Content Factory',
    icon: '🎥',
    poster_url: '/images/poster-ai-content-factory.jpg',
    logo_url: '/images/logo-ai-content-factory.jpg',
    price: '299 บาท',
    is_active: true,
    is_coming_soon: false,
    sort_order: 2,
  },
  {
    id: 'default-fashion',
    slug: 'puppap-fashion-studio',
    name: 'PUP PAP Fashion Studio',
    icon: '👗',
    poster_url: '/images/poster-puppap-fashion-studio.jpg',
    logo_url: '/images/poster-puppap-fashion-studio.jpg',
    price: '299',
    is_active: true,
    is_coming_soon: false,
    sort_order: 2,
  },
  {
    id: 'default-ugc-product',
    slug: 'puppap-ugc-product',
    name: 'PUPPAP AI UGC Product',
    icon: '✨',
    poster_url: '/images/poster-puppap-ugc-product.jpg',
    logo_url: '/images/poster-puppap-ugc-product.jpg',
    price: '299',
    is_active: true,
    is_coming_soon: false,
    sort_order: 3,
  },
  {
    id: 'default-banana',
    slug: 'pup-pap-banana-ai-studio',
    name: 'PUP PAP Banana AI Studio',
    icon: '🧼',
    poster_url: 'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/poster_1794145940853.jpeg',
    logo_url: 'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/logo_1794145953332.jpeg',
    price: '0 บาท',
    is_active: true,
    is_coming_soon: false,
    sort_order: 4,
  },
  {
    id: 'default-storypro',
    slug: 'pup-pap-storypro',
    name: 'PUP PAP StoryPro V7.0 DECK',
    icon: '📦',
    poster_url: 'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/poster_1794117210595.jpg',
    logo_url: 'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/logo_1794117213578.jpg',
    price: '299 บาท',
    is_active: true,
    is_coming_soon: false,
    sort_order: 5,
  },
];

export function resolveStandalonePrice(tool: any): number {
  const pInfo = getPriceInfo(tool?.price ?? '0', tool?.features);
  return Math.max(0, pInfo.numericPrice);
}

export function getShortVisualTitle(tool: any): string {
  if (!tool) return 'เครื่องมือ AI';
  if (tool.slug && SHORT_TITLE_MAP[tool.slug]) {
    return SHORT_TITLE_MAP[tool.slug];
  }
  const feat = typeof tool.features === 'object' && tool.features ? tool.features : {};
  if (typeof feat.short_title === 'string' && feat.short_title.trim()) {
    return feat.short_title.trim();
  }
  return String(tool.name || 'เครื่องมือ AI')
    .replace(/^PUP\s*PAP\s*(AI\s*)?/i, '')
    .replace(/^Ai\s*SALER\s*PRO\s*-\s*/i, '')
    .trim()
    .slice(0, 18);
}

export function getAllInOnePricing(
  rawTools?: any[] | null,
  currentToolSlug?: string | null,
  packagePriceOverride?: number
): AllInOnePricingSummary {
  const sourceList = Array.isArray(rawTools) ? rawTools : DEFAULT_SHOWCASE_TOOLS;

  // ดึงราคาแพ็กเกจจากแถว puppap-all-in-one ใน DB อัตโนมัติ (ถ้ามี)
  const packageTool = sourceList.find((t) => t && t.slug === ALL_IN_ONE_SLUG);
  const packageToolPrice = packageTool ? resolveStandalonePrice(packageTool) : 0;
  const packagePrice =
    typeof packagePriceOverride === 'number' && packagePriceOverride > 0
      ? packagePriceOverride
      : packageToolPrice > 0
        ? packageToolPrice
        : 999;

  const eligibleRaw = sourceList.filter(
    (t) => t && t.slug !== ALL_IN_ONE_SLUG && isToolEligibleForAllInOne(t)
  );

  const items: ShowcaseToolItem[] = eligibleRaw.map((t, idx) => {
    const isCourse = t.slug === 'tiktok-ai-affiliate' || t.category === 'course';
    const standalonePrice = resolveStandalonePrice(t);
    const priceLabel =
      standalonePrice > 0 ? `฿${standalonePrice.toLocaleString('en-US')}` : 'ฟรีในแพ็ก';

    return {
      id: String(t.id || `slot-${idx}`),
      slug: String(t.slug || `tool-${idx}`),
      name: String(t.name || 'เครื่องมือ AI'),
      shortTitle: getShortVisualTitle(t),
      icon: String(t.icon || (isCourse ? '🎓' : '🎬')),
      posterUrl: t.poster_url || t.logo_url || null,
      logoUrl: t.logo_url || t.poster_url || null,
      standalonePrice,
      priceLabel,
      isCourse,
    };
  });

  const itemCount = items.length;
  const isEmpty = itemCount === 0;
  const toolOnlyCount = items.filter((i) => !i.isCourse).length;

  const totalSeparateValue = items.reduce((acc, it) => acc + it.standalonePrice, 0);
  const savingsAmount = isEmpty ? 0 : Math.max(0, totalSeparateValue - packagePrice);
  // หมายเหตุ: discountPercent คำนวณสดจากข้อมูลจริง (เช่น 1055 / 2054 = 51%) ไม่ใช่ค่าคงที่
  const discountPercent =
    !isEmpty && totalSeparateValue > 0
      ? Math.min(95, Math.max(0, Math.round((savingsAmount / totalSeparateValue) * 100)))
      : 0;
  const unitCostAvg = isEmpty ? 0 : Math.round(packagePrice / itemCount);

  const courseItem = items.find((i) => i.isCourse);
  const coursePrice = courseItem ? courseItem.standalonePrice : 159;
  const courseBonusToolsValue = items
    .filter((i) => (COURSE_BUNDLE_BONUS_TOOL_SLUGS as readonly string[]).includes(i.slug))
    .reduce((acc, it) => acc + it.standalonePrice, 0);

  const currentItemIndex = currentToolSlug
    ? items.findIndex((it) => it.slug === currentToolSlug)
    : -1;
  const currentItem = currentItemIndex >= 0 ? items[currentItemIndex] : null;
  const isCurrentToolEligible = Boolean(currentItem);

  const upgradeDiffAmount = currentItem
    ? Math.max(0, packagePrice - currentItem.standalonePrice)
    : 0;

  const shouldUseDiffFraming = Boolean(
    currentItem && currentItem.standalonePrice >= 250 && upgradeDiffAmount <= 750
  );

  return {
    isEmpty,
    items,
    itemCount,
    toolOnlyCount,
    packagePrice,
    packagePriceFormatted: packagePrice.toLocaleString('en-US'),
    totalSeparateValue,
    totalSeparateFormatted: totalSeparateValue.toLocaleString('en-US'),
    savingsAmount,
    savingsFormatted: savingsAmount.toLocaleString('en-US'),
    discountPercent,
    unitCostAvg,
    coursePrice,
    coursePriceFormatted: coursePrice.toLocaleString('en-US'),
    courseBonusToolsValue,
    courseBonusToolsFormatted: courseBonusToolsValue.toLocaleString('en-US'),
    currentItem,
    currentItemIndex,
    isCurrentToolEligible,
    upgradeDiffAmount,
    upgradeDiffFormatted: upgradeDiffAmount.toLocaleString('en-US'),
    shouldUseDiffFraming,
  };
}
