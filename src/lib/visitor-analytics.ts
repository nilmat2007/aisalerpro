export const ALLOWED_PATH_REGEX =
  /^\/($|courses$|course\/[a-zA-Z0-9_-]+$|checkout\/[a-zA-Z0-9_-]+$|flow-tools$|store$|tool\/[a-zA-Z0-9_-]+$|login$|privacy$|terms$)/;

export const BOT_UA_REGEX =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|facebookexternalhit|twitterbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|embedly|quora link preview|pinterest|crawler|spider|uptimerobot|headlesschrome|lighthouse|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider/i;

export const PV_DEDUP_WINDOW_MS = 30 * 1000; // 30 seconds per IP + endpoint
export const PV_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
export const PV_RATE_LIMIT_MAX_PER_MIN = 30; // max 30 PV writes/min per IP
export const LAST_LOGIN_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const STALE_LOCK_MS = 5 * 60 * 1000; // 5 minutes stale-lock recovery
export const DEFAULT_NEW_MEMBER_CUTOFF_AT = '2026-11-04T00:00:00.000Z';

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return true;
  // Explicitly allow human users inside LINE in-app browser (e.g. "Mozilla/5.0 ... Line/14.x")
  if (/Line\/\d+/i.test(ua) && /Mozilla\/5\.0/i.test(ua)) {
    return false;
  }
  return BOT_UA_REGEX.test(ua);
}

export function isValidTrackPathname(pathname: string | null | undefined): pathname is string {
  if (!pathname || typeof pathname !== 'string' || pathname.length > 100) return false;
  return ALLOWED_PATH_REGEX.test(pathname);
}

export function encodePvEndpoint(pathname: string, utmContent?: string | null): string {
  const cleanUtm =
    utmContent && typeof utmContent === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(utmContent.trim())
      ? utmContent.trim()
      : '';
  return cleanUtm ? `pv:${pathname}|utm=${cleanUtm}` : `pv:${pathname}`;
}

export function parsePvEndpoint(
  endpoint: string
): { pathname: string; utmContent: string | null } | null {
  if (!endpoint || !endpoint.startsWith('pv:')) return null;
  const raw = endpoint.slice(3);
  const [pathname, utmPart] = raw.split('|utm=');
  if (!pathname) return null;
  return {
    pathname,
    utmContent: utmPart ? utmPart.trim() : null,
  };
}

export interface PvRow {
  endpoint: string;
  ip_hash: string;
  created_at: string;
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'หน้าแรก (Home)',
  '/courses': 'หน้ารายละเอียดคอร์ส (/courses)',
  '/course/tiktok-ai-affiliate': 'ห้องเรียนคอร์ส AI (/course/...)',
  '/checkout/tiktok-ai-affiliate': 'หน้าชำระเงินคอร์ส (/checkout/...)',
  '/flow-tools': 'หน้าเครื่องมือ Flow (/flow-tools)',
  '/store': 'หน้าร้านค้า (/store)',
  '/login': 'หน้าล็อกอิน (/login)',
};

function toThaiDateKey(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
  } catch {
    return isoStr.slice(0, 10);
  }
}

export function computeTrafficAnalytics(rows: PvRow[], now = new Date()) {
  const todayKey = toThaiDateKey(now.toISOString());

  const todayUvSet = new Set<string>();
  let todayPv = 0;
  const todayCourseUvSet = new Set<string>();
  const todayCheckoutUvSet = new Set<string>();

  const sevenDayUvSet = new Set<string>();
  let sevenDayPv = 0;

  const dailyMap = new Map<string, { uvSet: Set<string>; pv: number; label: string }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = toThaiDateKey(d.toISOString());
    const label = d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Bangkok',
    });
    dailyMap.set(key, { uvSet: new Set<string>(), pv: 0, label });
  }

  const pageMap = new Map<string, { pv: number; uvSet: Set<string> }>();
  const utmMap = new Map<string, { pv: number; uvSet: Set<string> }>();

  for (const row of rows) {
    const parsed = parsePvEndpoint(row.endpoint);
    if (!parsed) continue;

    const { pathname, utmContent } = parsed;
    const dateKey = toThaiDateKey(row.created_at);

    sevenDayPv += 1;
    sevenDayUvSet.add(row.ip_hash);

    const dayBucket = dailyMap.get(dateKey);
    if (dayBucket) {
      dayBucket.pv += 1;
      dayBucket.uvSet.add(row.ip_hash);
    }

    if (dateKey === todayKey) {
      todayPv += 1;
      todayUvSet.add(row.ip_hash);
      if (pathname === '/courses' || pathname.startsWith('/course/')) {
        todayCourseUvSet.add(row.ip_hash);
      }
      if (pathname.startsWith('/checkout/')) {
        todayCheckoutUvSet.add(row.ip_hash);
      }
    }

    // Group Top Pages by stripped pathname (without |utm=...)
    let pageEntry = pageMap.get(pathname);
    if (!pageEntry) {
      pageEntry = { pv: 0, uvSet: new Set<string>() };
      pageMap.set(pathname, pageEntry);
    }
    pageEntry.pv += 1;
    pageEntry.uvSet.add(row.ip_hash);

    if (utmContent) {
      let utmEntry = utmMap.get(utmContent);
      if (!utmEntry) {
        utmEntry = { pv: 0, uvSet: new Set<string>() };
        utmMap.set(utmContent, utmEntry);
      }
      utmEntry.pv += 1;
      utmEntry.uvSet.add(row.ip_hash);
    }
  }

  const dailySeries = Array.from(dailyMap.entries()).map(([dateKey, item]) => ({
    dateKey,
    label: item.label,
    uv: item.uvSet.size,
    pv: item.pv,
  }));

  const topPages = Array.from(pageMap.entries())
    .map(([pathname, item]) => ({
      pathname,
      label: PAGE_LABELS[pathname] || pathname,
      pv: item.pv,
      uv: item.uvSet.size,
    }))
    .sort((a, b) => b.uv - a.uv || b.pv - a.pv)
    .slice(0, 6);

  const utmBreakdown = Array.from(utmMap.entries())
    .map(([utm, item]) => ({
      utm,
      pv: item.pv,
      uv: item.uvSet.size,
    }))
    .sort((a, b) => b.uv - a.uv || b.pv - a.pv);

  return {
    todayUv: todayUvSet.size,
    todayPv,
    todayCourseUv: todayCourseUvSet.size,
    todayCheckoutUv: todayCheckoutUvSet.size,
    sevenDayUv: sevenDayUvSet.size,
    sevenDayPv,
    dailySeries,
    topPages,
    utmBreakdown,
  };
}
