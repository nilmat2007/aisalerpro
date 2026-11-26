import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AB_MIN_SAMPLE_PER_VARIANT,
  parsePvEndpointExtended,
  type PvRow,
} from '@/lib/visitor-analytics';

export const PV_BATCH_SIZE = 1000;
export const MAX_PV_BATCHES = 35; // Up to 35,000 pageview rows (~90 days)
export const DEFAULT_LOOKBACK_DAYS = 90;

export type SaleChannel = 'web_auto_slip' | 'web_admin' | 'direct_key';

export interface DashboardToolMeta {
  id: string;
  slug: string;
  name: string;
  icon: string;
  priceNum: number;
  priceLabel: string;
  isActive: boolean;
  isComingSoon: boolean;
}

export interface UnifiedSaleRecord {
  id: string;
  orderId: string | null;
  licenseKeyId: string | null;
  keyCode: string | null;
  userId: string | null;
  email: string;
  toolId: string | null;
  toolSlug: string;
  toolName: string;
  toolIcon: string;
  amount: number;
  channel: SaleChannel;
  actorLabel: string;
  dateIso: string;
  dateKey: string; // YYYY-MM-DD in Asia/Bangkok
  hour: number; // 0..23 in Asia/Bangkok
}

export interface RejectedOrPendingOrder {
  id: string;
  status: 'pending' | 'rejected';
  email: string;
  toolSlug: string;
  toolName: string;
  amount: number;
  slipUrl: string | null;
  adminNote: string;
  rejectCategory: 'old_slip' | 'wrong_amount' | 'duplicate_slip' | 'revoked' | 'other';
  createdAtIso: string;
  dateKey: string;
  hour: number;
}

export interface HotLeadItem {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  leadType: 'trial_not_bought' | 'recent_login_no_buy' | 'rejected_slip_unpaid';
  interestedToolName: string;
  interestedToolSlug: string;
  trialStatus: string | null;
  lastActiveIso: string;
  lastActiveDateKey: string;
}

export interface MemberRecordCompact {
  id: string;
  email: string;
  displayName: string;
  createdAtIso: string;
  createdDateKey: string;
  lastLoginIso: string | null;
  hasPurchased: boolean;
  totalSpent: number;
  ordersCount: number;
}

export interface TrialRecordCompact {
  id: string;
  userId: string;
  toolId: string;
  toolSlug: string;
  status: string;
  createdAtIso: string;
  dateKey: string;
}

/**
 * Compact integer-indexed visit tuple for zero-PII, fast client-side drill-down:
 * [dateIdx, hour, visitorIdx, pathIdx, utmIdx, srcIdx, devCode]
 * where devCode: 0 = unknown, 1 = mobile, 2 = desktop
 */
export type CompactVisitTuple = [
  number, // 0: dateIdx into calendarDays
  number, // 1: hour (0..23 Asia/Bangkok)
  number, // 2: anonymous visitorIdx
  number, // 3: pathIdx into pathCatalog
  number, // 4: utmIdx into utmCatalog (-1 if none)
  number, // 5: srcIdx into srcCatalog (-1 if none)
  number, // 6: devCode (0 = unknown, 1 = mobile, 2 = desktop)
];

/**
 * Compact funnel event tuple (/event/*):
 * [dateIdx, hour, visitorIdx, eventNameIdx, utmIdx, variantCode]
 * where variantCode: 0 = none, 1 = A, 2 = B
 */
export type CompactEventTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface AdminDashboardPayload {
  generatedAtIso: string;
  todayDateKey: string;
  systemCounts: {
    totalTools: number;
    activeTools: number;
    totalMembers: number;
    totalKeys: number;
    activatedKeys: number;
    availableKeys: number;
    pendingOrders: number;
    rejectedOrdersCount: number;
    totalPvRowsLoaded: number;
    pvWasCapped: boolean;
  };
  toolsCatalog: DashboardToolMeta[];
  calendarDays: Array<{
    dateKey: string; // YYYY-MM-DD
    shortLabel: string; // e.g. "26 พ.ย."
    fullLabel: string; // e.g. "พฤ. 26 พ.ย. 69"
    isWeekend: boolean;
  }>;
  pathCatalog: Array<{
    pathname: string;
    label: string;
    category: 'home' | 'course' | 'tool' | 'checkout' | 'store' | 'auth' | 'other';
    toolSlug: string | null;
  }>;
  utmCatalog: string[];
  srcCatalog: string[];
  eventCatalog: string[];
  visits: CompactVisitTuple[];
  funnelEvents: CompactEventTuple[];
  sales: UnifiedSaleRecord[];
  attentionOrders: RejectedOrPendingOrder[];
  trials: TrialRecordCompact[];
  members: MemberRecordCompact[];
  hotLeads: HotLeadItem[];
  abMinSamplePerVariant: number;
}

export function parsePriceNumber(price: string | number | null | undefined): number {
  if (typeof price === 'number') return Number.isFinite(price) ? price : 0;
  if (!price) return 0;
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

const bkkDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const bkkHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  hourCycle: 'h23',
});

export function toBangkokDateAndHour(isoStr: string | null | undefined): {
  dateKey: string;
  hour: number;
} {
  if (!isoStr) return { dateKey: '', hour: 0 };
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) {
    return { dateKey: String(isoStr).slice(0, 10), hour: 0 };
  }
  const dateKey = bkkDateFormatter.format(d);
  const rawHour = parseInt(bkkHourFormatter.format(d), 10);
  const hour = Number.isFinite(rawHour) && rawHour >= 0 && rawHour <= 23 ? rawHour : 0;
  return { dateKey, hour };
}

export function classifyPath(
  pathname: string,
  toolNameBySlug: Map<string, string>
): {
  label: string;
  category: 'home' | 'course' | 'tool' | 'checkout' | 'store' | 'auth' | 'other';
  toolSlug: string | null;
} {
  if (pathname === '/') {
    return { label: 'หน้าแรก (Home)', category: 'home', toolSlug: null };
  }
  if (pathname === '/courses') {
    return {
      label: 'หน้ารายละเอียดคอร์ส (/courses)',
      category: 'course',
      toolSlug: 'tiktok-ai-affiliate',
    };
  }
  if (pathname.startsWith('/course/')) {
    const slug = pathname.slice('/course/'.length);
    return {
      label: `ห้องเรียนคอร์ส (${slug})`,
      category: 'course',
      toolSlug: slug || 'tiktok-ai-affiliate',
    };
  }
  if (pathname.startsWith('/tool/')) {
    const slug = pathname.slice('/tool/'.length);
    const tName = toolNameBySlug.get(slug);
    return {
      label: tName ? `${tName} (/tool/${slug})` : `/tool/${slug}`,
      category: 'tool',
      toolSlug: slug || null,
    };
  }
  if (pathname.startsWith('/checkout/')) {
    const slug = pathname.slice('/checkout/'.length);
    const tName = toolNameBySlug.get(slug);
    return {
      label: tName ? `ชำระเงิน: ${tName}` : `หน้าชำระเงิน (/checkout/${slug})`,
      category: 'checkout',
      toolSlug: slug || null,
    };
  }
  if (pathname === '/flow-tools') {
    return { label: 'รวมเครื่องมือ AI (/flow-tools)', category: 'store', toolSlug: null };
  }
  if (pathname === '/store') {
    return { label: 'หน้าร้านค้า (/store)', category: 'store', toolSlug: null };
  }
  if (pathname === '/login') {
    return { label: 'หน้าเข้าสู่ระบบ (/login)', category: 'auth', toolSlug: null };
  }
  return { label: pathname, category: 'other', toolSlug: null };
}

export function classifyRejectReason(
  note: string | null | undefined
): RejectedOrPendingOrder['rejectCategory'] {
  const n = (note || '').toUpperCase();
  if (n.includes('AI-REJECTED-OLD') || n.includes('เกินเวลา')) return 'old_slip';
  if (n.includes('AI-REJECTED-DUPLICATE') || n.includes('ซ้ำ')) return 'duplicate_slip';
  if (n.includes('AI-REJECTED-AMOUNT') || n.includes('ยอดเงินไม่ตรง') || n.includes('ยอดไม่ตรง')) {
    return 'wrong_amount';
  }
  if (n.includes('REVOKED') || n.includes('ยกเลิกสิทธิ์')) return 'revoked';
  return 'other';
}

/**
 * Safely paginates `rate_limit_attempts` (`endpoint LIKE 'pv:%'`) past PostgREST's 1,000-row cap,
 * with a strict row bound and timeout guard so `/admin/dashboard` never stalls or truncates recent days.
 */
export async function fetchAllPvRowsPaginated(
  supabase: SupabaseClient,
  sinceIso: string,
  options?: {
    batchSize?: number;
    maxBatches?: number;
    timeoutMs?: number;
  }
): Promise<{ rows: PvRow[]; capped: boolean }> {
  const batchSize = options?.batchSize ?? PV_BATCH_SIZE;
  const maxBatches = options?.maxBatches ?? MAX_PV_BATCHES;
  const timeoutMs = options?.timeoutMs ?? 6500;
  const deadline = Date.now() + timeoutMs;

  const collected: PvRow[] = [];
  let capped = false;

  for (let page = 0; page < maxBatches; page++) {
    if (Date.now() >= deadline) {
      capped = true;
      break;
    }
    const from = page * batchSize;
    const to = from + batchSize - 1;

    const { data, error } = await supabase
      .from('rate_limit_attempts')
      .select('endpoint, ip_hash, created_at')
      .like('endpoint', 'pv:%')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[admin-analytics] PV batch fetch error:', error.message);
      break;
    }

    const chunk = (data as PvRow[]) || [];
    if (chunk.length === 0) break;

    for (const r of chunk) {
      collected.push(r);
    }

    if (chunk.length < batchSize) {
      break;
    }

    if (page === maxBatches - 1) {
      capped = true;
    }
  }

  return { rows: collected, capped };
}

/**
 * Pure builder function (unit-testable without network calls) that assembles the complete
 * drill-down payload from raw table arrays.
 */
export function buildAdminDashboardPayload(input: {
  now?: Date;
  lookbackDays?: number;
  tools: any[];
  orders: any[];
  licenses: any[];
  profiles: any[];
  trials: any[];
  pvRows: PvRow[];
  pvWasCapped?: boolean;
  counts?: {
    totalKeys?: number;
    availableKeys?: number;
  };
}): AdminDashboardPayload {
  const now = input.now ?? new Date();
  const lookbackDays = input.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const { dateKey: todayDateKey } = toBangkokDateAndHour(now.toISOString());

  // 1. Build Tools Catalog
  const toolById = new Map<string, DashboardToolMeta>();
  const toolNameBySlug = new Map<string, string>();
  const toolsCatalog: DashboardToolMeta[] = [];

  for (const t of input.tools || []) {
    const meta: DashboardToolMeta = {
      id: String(t.id),
      slug: String(t.slug || ''),
      name: String(t.name || t.slug || 'ไม่ระบุ'),
      icon: String(t.icon || '🛠️'),
      priceNum: parsePriceNumber(t.price),
      priceLabel: String(t.price || '0'),
      isActive: Boolean(t.is_active),
      isComingSoon: Boolean(t.is_coming_soon),
    };
    toolById.set(meta.id, meta);
    if (meta.slug) toolNameBySlug.set(meta.slug, meta.name);
    toolsCatalog.push(meta);
  }

  // 2. Build Calendar Days (oldest -> newest across lookbackDays)
  const calendarDays: AdminDashboardPayload['calendarDays'] = [];
  const dateKeyToIdx = new Map<string, number>();

  // Anchor at noon Asia/Bangkok today to step backwards cleanly by calendar day without DST/UTC edge issues
  const anchorNoonUtc = new Date(`${todayDateKey}T12:00:00+07:00`);
  for (let i = lookbackDays - 1; i >= 0; i--) {
    const d = new Date(anchorNoonUtc.getTime() - i * 24 * 60 * 60 * 1000);
    const { dateKey } = toBangkokDateAndHour(d.toISOString());
    if (dateKeyToIdx.has(dateKey)) continue;
    const shortLabel = d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Bangkok',
    });
    const fullLabel = d.toLocaleDateString('th-TH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      timeZone: 'Asia/Bangkok',
    });
    const dayOfWeek = new Date(`${dateKey}T12:00:00+07:00`).getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    dateKeyToIdx.set(dateKey, calendarDays.length);
    calendarDays.push({ dateKey, shortLabel, fullLabel, isWeekend });
  }

  // 3. Build Unified Sales Ledger (Approved Orders + Standalone Activated License Keys — Zero Double Counting!)
  const sales: UnifiedSaleRecord[] = [];
  const attentionOrders: RejectedOrPendingOrder[] = [];
  const licenseKeyById = new Map<string, any>();
  for (const lic of input.licenses || []) {
    if (lic?.id) licenseKeyById.set(String(lic.id), lic);
  }

  const consumedLicenseKeyIds = new Set<string>();
  let pendingOrdersCount = 0;
  let rejectedOrdersCount = 0;

  for (const ord of input.orders || []) {
    const tool = ord.tool_id ? toolById.get(String(ord.tool_id)) : undefined;
    const toolSlug = tool?.slug || (ord.package_type === 'all' ? 'puppap-all-in-one' : 'unknown');
    const toolName =
      tool?.name || (ord.package_type === 'all' ? 'All-in-One Package' : 'ไม่ระบุเครื่องมือ');
    const toolIcon = tool?.icon || '📦';

    if (ord.status === 'approved') {
      if (ord.license_key_id) {
        consumedLicenseKeyIds.add(String(ord.license_key_id));
      }
      const linkedKey = ord.license_key_id ? licenseKeyById.get(String(ord.license_key_id)) : null;
      const dateIso = String(ord.approved_at || ord.created_at || '');
      const { dateKey, hour } = toBangkokDateAndHour(dateIso);
      const rawAmount = parsePriceNumber(ord.amount);
      const amount = rawAmount > 0 ? rawAmount : tool?.priceNum || 0;
      const noteStr = String(ord.admin_note || '');
      const isAutoSlip =
        noteStr.includes('system:auto_slip') || noteStr.includes('[AUTO-APPROVED');
      const channel: SaleChannel = isAutoSlip ? 'web_auto_slip' : 'web_admin';
      const actorLabel = isAutoSlip
        ? 'AI ตรวจสลิปอัตโนมัติ'
        : noteStr.includes('telegram:')
          ? 'อนุมัติผ่าน Telegram'
          : noteStr.includes('manual_override') || noteStr.includes('ADMIN_OVERRIDE')
            ? 'แอดมินอนุมัติย้อนหลัง (Override)'
            : 'แอดมินอนุมัติหน้าเว็บ';

      sales.push({
        id: `ord_${ord.id}`,
        orderId: String(ord.id),
        licenseKeyId: ord.license_key_id ? String(ord.license_key_id) : null,
        keyCode: linkedKey?.key_code ? String(linkedKey.key_code) : null,
        userId: ord.user_id ? String(ord.user_id) : null,
        email: String(ord.user_email || linkedKey?.activated_email || '').trim(),
        toolId: ord.tool_id ? String(ord.tool_id) : null,
        toolSlug,
        toolName,
        toolIcon,
        amount,
        channel,
        actorLabel,
        dateIso,
        dateKey,
        hour,
      });
    } else if (ord.status === 'pending' || ord.status === 'rejected') {
      if (ord.status === 'pending') pendingOrdersCount++;
      if (ord.status === 'rejected') rejectedOrdersCount++;
      const createdAtIso = String(ord.created_at || '');
      const { dateKey, hour } = toBangkokDateAndHour(createdAtIso);
      attentionOrders.push({
        id: String(ord.id),
        status: ord.status,
        email: String(ord.user_email || '').trim(),
        toolSlug,
        toolName,
        amount: parsePriceNumber(ord.amount) || tool?.priceNum || 0,
        slipUrl: ord.slip_url ? String(ord.slip_url) : null,
        adminNote: String(ord.admin_note || ''),
        rejectCategory: classifyRejectReason(ord.admin_note),
        createdAtIso,
        dateKey,
        hour,
      });
    }
  }

  // Standalone activated license keys (issued via Direct / Chat / Telegram without a web `orders` row)
  let activatedKeysCount = 0;
  for (const lic of input.licenses || []) {
    if (lic.status !== 'activated') continue;
    activatedKeysCount++;
    if (consumedLicenseKeyIds.has(String(lic.id))) continue;

    const tool = lic.tool_id ? toolById.get(String(lic.tool_id)) : undefined;
    const joinedTool = lic.tools || null;
    const toolSlug =
      tool?.slug ||
      joinedTool?.slug ||
      (lic.package_type === 'all' ? 'puppap-all-in-one' : 'unknown');
    const toolName =
      tool?.name ||
      joinedTool?.name ||
      (lic.package_type === 'all' ? 'All-in-One Package' : 'ไม่ระบุเครื่องมือ');
    const toolIcon = tool?.icon || '🔑';
    const amount = tool?.priceNum ?? parsePriceNumber(joinedTool?.price);
    const dateIso = String(lic.activated_at || lic.created_at || '');
    const { dateKey, hour } = toBangkokDateAndHour(dateIso);
    const noteText = String(lic.note || '').trim();

    sales.push({
      id: `key_${lic.id}`,
      orderId: null,
      licenseKeyId: String(lic.id),
      keyCode: lic.key_code ? String(lic.key_code) : null,
      userId: lic.activated_by ? String(lic.activated_by) : null,
      email: String(lic.activated_email || '').trim(),
      toolId: lic.tool_id ? String(lic.tool_id) : null,
      toolSlug,
      toolName,
      toolIcon,
      amount,
      channel: 'direct_key',
      actorLabel: noteText ? `ออกคีย์ตรง (${noteText.slice(0, 40)})` : 'ออกคีย์ตรง / แชทเพจ',
      dateIso,
      dateKey,
      hour,
    });
  }

  sales.sort((a, b) => (b.dateIso || '').localeCompare(a.dateIso || ''));
  attentionOrders.sort((a, b) => (b.createdAtIso || '').localeCompare(a.createdAtIso || ''));

  // 4. Customer Spending & Purchase Lookup
  const spendByUserId = new Map<string, { spent: number; count: number }>();
  const spendByEmail = new Map<string, { spent: number; count: number }>();
  for (const s of sales) {
    if (s.userId) {
      const cur = spendByUserId.get(s.userId) || { spent: 0, count: 0 };
      cur.spent += s.amount;
      cur.count += 1;
      spendByUserId.set(s.userId, cur);
    }
    const em = s.email.toLowerCase();
    if (em) {
      const cur = spendByEmail.get(em) || { spent: 0, count: 0 };
      cur.spent += s.amount;
      cur.count += 1;
      spendByEmail.set(em, cur);
    }
  }

  // 5. Members Compact List
  const members: MemberRecordCompact[] = [];
  const profileById = new Map<string, any>();
  for (const p of input.profiles || []) {
    const uid = String(p.id);
    profileById.set(uid, p);
    const email = String(p.email || '').trim();
    const displayName = String(
      p.display_name || p.full_name || (email ? email.split('@')[0] : 'สมาชิก')
    ).trim();
    const createdAtIso = String(p.created_at || '');
    const { dateKey: createdDateKey } = toBangkokDateAndHour(createdAtIso);
    const byUid = spendByUserId.get(uid);
    const byEm = email ? spendByEmail.get(email.toLowerCase()) : undefined;
    const totalSpent = byUid ? byUid.spent : byEm?.spent || 0;
    const ordersCount = byUid ? byUid.count : byEm?.count || 0;

    members.push({
      id: uid,
      email,
      displayName,
      createdAtIso,
      createdDateKey,
      lastLoginIso: p.last_login_at ? String(p.last_login_at) : null,
      hasPurchased: ordersCount > 0,
      totalSpent,
      ordersCount,
    });
  }
  members.sort((a, b) => (b.createdAtIso || '').localeCompare(a.createdAtIso || ''));

  // 6. Trials Compact List
  const trials: TrialRecordCompact[] = [];
  for (const tr of input.trials || []) {
    const tool = tr.tool_id ? toolById.get(String(tr.tool_id)) : undefined;
    const createdAtIso = String(tr.created_at || tr.started_at || '');
    const { dateKey } = toBangkokDateAndHour(createdAtIso);
    trials.push({
      id: String(tr.id),
      userId: String(tr.user_id || ''),
      toolId: String(tr.tool_id || ''),
      toolSlug: tool?.slug || 'unknown',
      status: String(tr.status || 'expired'),
      createdAtIso,
      dateKey,
    });
  }

  // 7. Build Hot Leads (Unpaid Rejected Slips + Trials Not Bought + Recent Active Members Not Bought)
  const hotLeads: HotLeadItem[] = [];
  const seenHotLeadEmails = new Set<string>();

  // Priority 1: Rejected/Pending orders where customer hasn't succeeded yet
  for (const att of attentionOrders) {
    if (att.rejectCategory === 'revoked') continue;
    const emLower = att.email.toLowerCase();
    if (!emLower || seenHotLeadEmails.has(emLower)) continue;
    if ((spendByEmail.get(emLower)?.count || 0) > 0) continue;
    seenHotLeadEmails.add(emLower);
    hotLeads.push({
      userId: '',
      email: att.email,
      displayName: att.email.split('@')[0] || att.email,
      avatarUrl: null,
      leadType: 'rejected_slip_unpaid',
      interestedToolName: att.toolName,
      interestedToolSlug: att.toolSlug,
      trialStatus: att.status === 'pending' ? 'รอตรวจสอบสลิป' : 'แนบสลิปไม่ผ่าน',
      lastActiveIso: att.createdAtIso,
      lastActiveDateKey: att.dateKey,
    });
  }

  // Priority 2: Members who requested a Trial and still haven't purchased anything
  const sortedTrials = [...trials].sort((a, b) =>
    (b.createdAtIso || '').localeCompare(a.createdAtIso || '')
  );
  for (const tr of sortedTrials) {
    if (spendByUserId.has(tr.userId)) continue;
    const prof = profileById.get(tr.userId);
    const email = String(prof?.email || '').trim();
    const emLower = email.toLowerCase();
    if (!email || seenHotLeadEmails.has(emLower)) continue;
    if ((spendByEmail.get(emLower)?.count || 0) > 0) continue;
    seenHotLeadEmails.add(emLower);
    const tool = toolById.get(tr.toolId);
    hotLeads.push({
      userId: tr.userId,
      email,
      displayName: String(prof?.display_name || prof?.full_name || email.split('@')[0]),
      avatarUrl: prof?.avatar_url || null,
      leadType: 'trial_not_bought',
      interestedToolName: tool?.name || tr.toolSlug,
      interestedToolSlug: tool?.slug || tr.toolSlug,
      trialStatus: tr.status,
      lastActiveIso: prof?.last_login_at || tr.createdAtIso,
      lastActiveDateKey: tr.dateKey,
    });
    if (hotLeads.length >= 60) break;
  }

  // Priority 3: Recently logged-in members who haven't bought yet
  const recentNonBuyers = members
    .filter((m) => !m.hasPurchased && m.email && m.lastLoginIso)
    .sort((a, b) => (b.lastLoginIso || '').localeCompare(a.lastLoginIso || ''));
  for (const m of recentNonBuyers) {
    if (hotLeads.length >= 80) break;
    const emLower = m.email.toLowerCase();
    if (seenHotLeadEmails.has(emLower)) continue;
    seenHotLeadEmails.add(emLower);
    const prof = profileById.get(m.id);
    const { dateKey } = toBangkokDateAndHour(m.lastLoginIso);
    hotLeads.push({
      userId: m.id,
      email: m.email,
      displayName: m.displayName,
      avatarUrl: prof?.avatar_url || null,
      leadType: 'recent_login_no_buy',
      interestedToolName: 'เข้าสู่ระบบดูสินค้าล่าสุด',
      interestedToolSlug: '',
      trialStatus: null,
      lastActiveIso: m.lastLoginIso || m.createdAtIso,
      lastActiveDateKey: dateKey,
    });
  }

  // 8. Index Pageviews & Funnel Events into Compact Anonymous Tuples
  const visitorMap = new Map<string, number>();
  const pathMap = new Map<string, number>();
  const pathCatalog: AdminDashboardPayload['pathCatalog'] = [];
  const utmMap = new Map<string, number>();
  const utmCatalog: string[] = [];
  const srcMap = new Map<string, number>();
  const srcCatalog: string[] = [];
  const eventMap = new Map<string, number>();
  const eventCatalog: string[] = [];

  const visits: CompactVisitTuple[] = [];
  const funnelEvents: CompactEventTuple[] = [];

  const getVisitorIdx = (ipHash: string): number => {
    let idx = visitorMap.get(ipHash);
    if (idx === undefined) {
      idx = visitorMap.size;
      visitorMap.set(ipHash, idx);
    }
    return idx;
  };

  const getUtmIdx = (utm: string | null): number => {
    if (!utm || utm.startsWith('variant_')) return -1;
    let idx = utmMap.get(utm);
    if (idx === undefined) {
      idx = utmCatalog.length;
      utmMap.set(utm, idx);
      utmCatalog.push(utm);
    }
    return idx;
  };

  const getSrcIdx = (src: string | null, utm: string | null): number => {
    let resolved = src || '';
    if (!resolved && utm) {
      const u = utm.toLowerCase();
      if (u.includes('fb') || u.includes('meta')) resolved = 'facebook';
      else if (u.includes('tiktok') || u.includes('tt')) resolved = 'tiktok';
      else if (u.includes('line')) resolved = 'line';
      else if (
        u.startsWith('all_in_one_') ||
        u.startsWith('preview_') ||
        u.startsWith('course_') ||
        u.startsWith('floating_')
      ) {
        resolved = 'internal_promo';
      }
    }
    if (!resolved) return -1;
    let idx = srcMap.get(resolved);
    if (idx === undefined) {
      idx = srcCatalog.length;
      srcMap.set(resolved, idx);
      srcCatalog.push(resolved);
    }
    return idx;
  };

  for (const row of input.pvRows || []) {
    const parsed = parsePvEndpointExtended(row.endpoint);
    if (!parsed) continue;

    const { dateKey, hour } = toBangkokDateAndHour(row.created_at);
    const dateIdx = dateKeyToIdx.get(dateKey);
    if (dateIdx === undefined) continue;

    const visitorIdx = getVisitorIdx(row.ip_hash || 'anon');

    if (parsed.pathname.startsWith('/event/')) {
      const eventName = parsed.pathname.slice('/event/'.length);
      let evIdx = eventMap.get(eventName);
      if (evIdx === undefined) {
        evIdx = eventCatalog.length;
        eventMap.set(eventName, evIdx);
        eventCatalog.push(eventName);
      }
      const isVarB = Boolean(
        parsed.utmContent &&
          (parsed.utmContent.endsWith('_B') || parsed.utmContent === 'variant_B')
      );
      const isVarA = Boolean(
        parsed.utmContent &&
          (parsed.utmContent.endsWith('_A') || parsed.utmContent === 'variant_A')
      );
      const variantCode = isVarB ? 2 : isVarA ? 1 : 0;
      const utmIdx = getUtmIdx(parsed.utmContent);
      funnelEvents.push([dateIdx, hour, visitorIdx, evIdx, utmIdx, variantCode]);
      continue;
    }

    let pIdx = pathMap.get(parsed.pathname);
    if (pIdx === undefined) {
      pIdx = pathCatalog.length;
      pathMap.set(parsed.pathname, pIdx);
      const classified = classifyPath(parsed.pathname, toolNameBySlug);
      pathCatalog.push({
        pathname: parsed.pathname,
        ...classified,
      });
    }

    const utmIdx = getUtmIdx(parsed.utmContent);
    const srcIdx = getSrcIdx(parsed.source, parsed.utmContent);
    const devCode = parsed.device === 'mobile' ? 1 : parsed.device === 'desktop' ? 2 : 0;

    visits.push([dateIdx, hour, visitorIdx, pIdx, utmIdx, srcIdx, devCode]);
  }

  return {
    generatedAtIso: now.toISOString(),
    todayDateKey,
    systemCounts: {
      totalTools: toolsCatalog.length,
      activeTools: toolsCatalog.filter((t) => t.isActive).length,
      totalMembers: members.length,
      totalKeys: input.counts?.totalKeys ?? (input.licenses || []).length,
      activatedKeys: activatedKeysCount,
      availableKeys:
        input.counts?.availableKeys ??
        (input.licenses || []).filter((l) => l.status === 'available').length,
      pendingOrders: pendingOrdersCount,
      rejectedOrdersCount,
      totalPvRowsLoaded: (input.pvRows || []).length,
      pvWasCapped: Boolean(input.pvWasCapped),
    },
    toolsCatalog,
    calendarDays,
    pathCatalog,
    utmCatalog,
    srcCatalog,
    eventCatalog,
    visits,
    funnelEvents,
    sales,
    attentionOrders,
    trials,
    members,
    hotLeads,
    abMinSamplePerVariant: AB_MIN_SAMPLE_PER_VARIANT,
  };
}

/**
 * Top-level Server Loader for `/admin/dashboard`.
 * Strictly read-only, selects zero secret columns (`flow_url`, `password` excluded).
 */
export async function loadAdminDashboardAnalytics(
  supabase: SupabaseClient,
  options?: { lookbackDays?: number }
): Promise<AdminDashboardPayload> {
  const lookbackDays = options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const now = new Date();
  const sinceIso = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  const [
    toolsRes,
    ordersRes,
    licensesRes,
    profilesRes,
    trialsRes,
    totalKeysRes,
    availKeysRes,
    pvResult,
  ] = await Promise.all([
    supabase
      .from('tools')
      .select('id, name, slug, icon, price, is_active, is_coming_soon, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('orders')
      .select(
        'id, user_id, user_email, tool_id, package_type, amount, slip_url, status, admin_note, license_key_id, created_at, approved_at'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('license_keys')
      .select(
        'id, key_code, tool_id, package_type, status, activated_by, activated_email, activated_at, note, created_at, tools(slug, name, price)'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, email, full_name, display_name, avatar_url, created_at, last_login_at')
      .order('created_at', { ascending: false })
      .limit(3000),
    supabase
      .from('user_trials')
      .select('id, user_id, tool_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3000),
    supabase.from('license_keys').select('*', { count: 'exact', head: true }),
    supabase
      .from('license_keys')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available'),
    fetchAllPvRowsPaginated(supabase, sinceIso),
  ]);

  return buildAdminDashboardPayload({
    now,
    lookbackDays,
    tools: toolsRes.data || [],
    orders: ordersRes.data || [],
    licenses: licensesRes.data || [],
    profiles: profilesRes.data || [],
    trials: trialsRes.data || [],
    pvRows: pvResult.rows,
    pvWasCapped: pvResult.capped,
    counts: {
      totalKeys: totalKeysRes.count ?? undefined,
      availableKeys: availKeysRes.count ?? undefined,
    },
  });
}
