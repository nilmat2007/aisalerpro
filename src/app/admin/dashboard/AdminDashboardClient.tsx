'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  AdminDashboardPayload,
  SaleChannel,
  UnifiedSaleRecord,
} from '@/lib/admin-analytics';

type TimePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '14d'
  | '30d'
  | 'this_month'
  | 'all'
  | 'custom';

type ChannelFilter = 'all' | 'web' | 'direct';
type ChartMode = 'visitors' | 'revenue' | 'combined';
type ToolSortKey = 'revenue' | 'sales' | 'toolUv' | 'checkoutUv' | 'convRate' | 'trials';
type BottomTab = 'sales' | 'attention' | 'leads' | 'vip';

const SOURCE_LABELS: Record<string, string> = {
  facebook: 'Facebook / Meta Ads',
  tiktok: 'TikTok',
  line: 'LINE In-App / OA',
  google: 'Google Search',
  instagram: 'Instagram',
  youtube: 'YouTube',
  internal_promo: 'แบนเนอร์/ป๊อปอัปในเว็บ',
  referral: 'เว็บไซต์ภายนอก (Referral)',
  direct: 'เข้าเว็บตรง / Bookmark',
};

function formatDeltaBadge(current: number, previous: number) {
  if (previous <= 0 && current <= 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 tabular-nums">
        0% เทียบช่วงก่อน
      </span>
    );
  }
  if (previous <= 0 && current > 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 tabular-nums">
        ▲ ใหม่ (+100%)
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
        isUp
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
          : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
      }`}
    >
      {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% เทียบช่วงก่อน
    </span>
  );
}

function matchesChannel(channel: SaleChannel, filter: ChannelFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'web') return channel === 'web_auto_slip' || channel === 'web_admin';
  return channel === 'direct_key';
}

function formatThaiDateTimeShort(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

export default function AdminDashboardClient({
  data,
}: {
  data: AdminDashboardPayload;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  // Global Controls
  const [preset, setPreset] = useState<TimePreset>('7d');
  const [customStart, setCustomStart] = useState<string>(
    data.calendarDays[Math.max(0, data.calendarDays.length - 7)]?.dateKey || data.todayDateKey
  );
  const [customEnd, setCustomEnd] = useState<string>(data.todayDateKey);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');

  // Drill-down states
  const [chartMode, setChartMode] = useState<ChartMode>('combined');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showPreviewSubFunnel, setShowPreviewSubFunnel] = useState<boolean>(false);

  // Tool Matrix states
  const [toolSortKey, setToolSortKey] = useState<ToolSortKey>('revenue');
  const [toolSortAsc, setToolSortAsc] = useState<boolean>(false);
  const [expandedToolSlug, setExpandedToolSlug] = useState<string | null>(null);

  // UTM Search & Bottom Operational Tab
  const [utmQuery, setUtmQuery] = useState<string>('');
  const [bottomTab, setBottomTab] = useState<BottomTab>(
    data.attentionOrders.some((o) => o.status === 'pending') ? 'attention' : 'sales'
  );
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = (email: string) => {
    if (!email || typeof navigator === 'undefined') return;
    navigator.clipboard?.writeText(email).catch(() => {});
    setCopiedEmail(email);
    setTimeout(() => {
      setCopiedEmail((cur) => (cur === email ? null : cur));
    }, 1800);
  };

  // 1. Compute Active Date Window [startDateKey, endDateKey] & Previous Window for % Delta
  const dateWindow = useMemo(() => {
    const days = data.calendarDays;
    const today = data.todayDateKey;
    const yesterdayObj = new Date(`${today}T12:00:00+07:00`);
    yesterdayObj.setUTCDate(yesterdayObj.getUTCDate() - 1);
    const yesterdayKey = yesterdayObj.toISOString().slice(0, 10);

    let startKey = today;
    let endKey = today;
    let label = 'วันนี้';

    const shiftKeyBack = (baseKey: string, numDays: number) => {
      const dt = new Date(`${baseKey}T12:00:00+07:00`);
      dt.setUTCDate(dt.getUTCDate() - numDays);
      return dt.toISOString().slice(0, 10);
    };

    if (preset === 'today') {
      startKey = today;
      endKey = today;
      label = 'วันนี้';
    } else if (preset === 'yesterday') {
      startKey = yesterdayKey;
      endKey = yesterdayKey;
      label = 'เมื่อวาน';
    } else if (preset === '7d') {
      startKey = shiftKeyBack(today, 6);
      endKey = today;
      label = '7 วันล่าสุด';
    } else if (preset === '14d') {
      startKey = shiftKeyBack(today, 13);
      endKey = today;
      label = '14 วันล่าสุด';
    } else if (preset === '30d') {
      startKey = shiftKeyBack(today, 29);
      endKey = today;
      label = '30 วันล่าสุด';
    } else if (preset === 'this_month') {
      startKey = `${today.slice(0, 7)}-01`;
      endKey = today;
      label = 'เดือนนี้';
    } else if (preset === 'all') {
      startKey = days[0]?.dateKey || shiftKeyBack(today, 89);
      endKey = today;
      label = 'ทั้งหมด';
    } else {
      startKey = customStart <= customEnd ? customStart : customEnd;
      endKey = customStart <= customEnd ? customEnd : customStart;
      label = `${startKey} ถึง ${endKey}`;
    }

    const startMs = new Date(`${startKey}T00:00:00+07:00`).getTime();
    const endMs = new Date(`${endKey}T00:00:00+07:00`).getTime();
    const spanDays = Math.max(1, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1);

    const prevEndKey = shiftKeyBack(startKey, 1);
    const prevStartKey = shiftKeyBack(prevEndKey, spanDays - 1);

    return {
      startKey,
      endKey,
      prevStartKey,
      prevEndKey,
      spanDays,
      label,
      isAllTime: preset === 'all',
    };
  }, [preset, customStart, customEnd, data.calendarDays, data.todayDateKey]);

  // 2. Main Analytics Computation for Selected Window & Previous Window
  const analytics = useMemo(() => {
    const { startKey, endKey, prevStartKey, prevEndKey, isAllTime } = dateWindow;

    // Map dayIdx -> dateKey
    const dayIdxInRange = new Set<number>();
    const dayIdxInPrev = new Set<number>();
    const activeCalendarDays: AdminDashboardPayload['calendarDays'] = [];

    data.calendarDays.forEach((d, idx) => {
      if (d.dateKey >= startKey && d.dateKey <= endKey) {
        dayIdxInRange.add(idx);
        activeCalendarDays.push(d);
      } else if (!isAllTime && d.dateKey >= prevStartKey && d.dateKey <= prevEndKey) {
        dayIdxInPrev.add(idx);
      }
    });

    // Sales filtering
    const allTimeFilteredSales = data.sales.filter((s) =>
      matchesChannel(s.channel, channelFilter)
    );
    const allTimeRevenue = allTimeFilteredSales.reduce((acc, s) => acc + s.amount, 0);

    const periodSales: UnifiedSaleRecord[] = [];
    const prevSales: UnifiedSaleRecord[] = [];

    for (const s of allTimeFilteredSales) {
      if (isAllTime || (s.dateKey >= startKey && s.dateKey <= endKey)) {
        periodSales.push(s);
      } else if (s.dateKey >= prevStartKey && s.dateKey <= prevEndKey) {
        prevSales.push(s);
      }
    }

    const periodRevenue = periodSales.reduce((acc, s) => acc + s.amount, 0);
    const prevRevenue = prevSales.reduce((acc, s) => acc + s.amount, 0);
    const webAutoCount = periodSales.filter((s) => s.channel === 'web_auto_slip').length;
    const webAdminCount = periodSales.filter((s) => s.channel === 'web_admin').length;
    const directKeyCount = periodSales.filter((s) => s.channel === 'direct_key').length;

    const uniqueBuyerSet = new Set<string>();
    for (const s of periodSales) {
      uniqueBuyerSet.add((s.userId || s.email || s.id).toLowerCase());
    }

    // Daily buckets
    const dailyMap = new Map<
      string,
      {
        dateKey: string;
        shortLabel: string;
        fullLabel: string;
        isWeekend: boolean;
        uvSet: Set<number>;
        pv: number;
        revenue: number;
        orders: number;
      }
    >();

    for (const d of activeCalendarDays) {
      dailyMap.set(d.dateKey, {
        ...d,
        uvSet: new Set<number>(),
        pv: 0,
        revenue: 0,
        orders: 0,
      });
    }

    for (const s of periodSales) {
      const bucket = dailyMap.get(s.dateKey);
      if (bucket) {
        bucket.revenue += s.amount;
        bucket.orders += 1;
      }
    }

    // Visitor & Page & UTM & Hourly aggregations
    const periodUvSet = new Set<number>();
    const prevUvSet = new Set<number>();
    let periodPv = 0;
    let prevPv = 0;

    // Funnel stage visitor sets
    const productOrCourseUvSet = new Set<number>();
    const checkoutUvSet = new Set<number>();

    // Per-page stats
    const pageStatsMap = new Map<number, { pv: number; uvSet: Set<number> }>();
    // Per-UTM stats (including checkout attribution!)
    const utmVisitorsMap = new Map<number, { pv: number; uvSet: Set<number> }>();
    const checkoutVisitorsSet = new Set<number>();
    // Per-Source stats
    const srcStatsMap = new Map<number, { pv: number; uvSet: Set<number> }>();
    // Device stats
    const mobileUvSet = new Set<number>();
    const desktopUvSet = new Set<number>();

    // Per-tool view & checkout UV sets
    const toolViewUvMap = new Map<string, Set<number>>();
    const toolCheckoutUvMap = new Map<string, Set<number>>();

    // 24-Hour Golden Time across selected period
    const hourlyTraffic = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      uvSet: new Set<number>(),
      pv: 0,
      orders: 0,
      revenue: 0,
    }));

    for (const s of periodSales) {
      if (s.hour >= 0 && s.hour <= 23) {
        hourlyTraffic[s.hour].orders += 1;
        hourlyTraffic[s.hour].revenue += s.amount;
      }
    }

    for (const v of data.visits) {
      const [dateIdx, hour, visitorIdx, pathIdx, utmIdx, srcIdx, devCode] = v;

      if (dayIdxInRange.has(dateIdx)) {
        periodPv += 1;
        periodUvSet.add(visitorIdx);

        const dayMeta = data.calendarDays[dateIdx];
        if (dayMeta) {
          const b = dailyMap.get(dayMeta.dateKey);
          if (b) {
            b.pv += 1;
            b.uvSet.add(visitorIdx);
          }
        }

        if (hour >= 0 && hour <= 23) {
          hourlyTraffic[hour].pv += 1;
          hourlyTraffic[hour].uvSet.add(visitorIdx);
        }

        const pInfo = data.pathCatalog[pathIdx];
        if (pInfo) {
          let ps = pageStatsMap.get(pathIdx);
          if (!ps) {
            ps = { pv: 0, uvSet: new Set<number>() };
            pageStatsMap.set(pathIdx, ps);
          }
          ps.pv += 1;
          ps.uvSet.add(visitorIdx);

          if (pInfo.category === 'tool' || pInfo.category === 'course' || pInfo.category === 'store') {
            productOrCourseUvSet.add(visitorIdx);
          }
          if (pInfo.category === 'checkout') {
            checkoutUvSet.add(visitorIdx);
            checkoutVisitorsSet.add(visitorIdx);
          }

          if (pInfo.toolSlug) {
            if (pInfo.category === 'tool' || pInfo.category === 'course') {
              if (!toolViewUvMap.has(pInfo.toolSlug)) {
                toolViewUvMap.set(pInfo.toolSlug, new Set<number>());
              }
              toolViewUvMap.get(pInfo.toolSlug)!.add(visitorIdx);
            } else if (pInfo.category === 'checkout') {
              if (!toolCheckoutUvMap.has(pInfo.toolSlug)) {
                toolCheckoutUvMap.set(pInfo.toolSlug, new Set<number>());
              }
              toolCheckoutUvMap.get(pInfo.toolSlug)!.add(visitorIdx);
            }
          }
        }

        if (utmIdx >= 0) {
          let us = utmVisitorsMap.get(utmIdx);
          if (!us) {
            us = { pv: 0, uvSet: new Set<number>() };
            utmVisitorsMap.set(utmIdx, us);
          }
          us.pv += 1;
          us.uvSet.add(visitorIdx);
        }

        if (srcIdx >= 0) {
          let ss = srcStatsMap.get(srcIdx);
          if (!ss) {
            ss = { pv: 0, uvSet: new Set<number>() };
            srcStatsMap.set(srcIdx, ss);
          }
          ss.pv += 1;
          ss.uvSet.add(visitorIdx);
        }

        if (devCode === 1) mobileUvSet.add(visitorIdx);
        else if (devCode === 2) desktopUvSet.add(visitorIdx);
      } else if (dayIdxInPrev.has(dateIdx)) {
        prevPv += 1;
        prevUvSet.add(visitorIdx);
      }
    }

    // Funnel Events (/event/*) in selected window
    const eventUvMap = new Map<string, Set<number>>();
    const varA = { plays: new Set<number>(), clicks: new Set<number>(), purchases: new Set<number>() };
    const varB = { plays: new Set<number>(), clicks: new Set<number>(), purchases: new Set<number>() };

    for (const ev of data.funnelEvents) {
      const [dateIdx, , visitorIdx, evIdx, utmIdx, variantCode] = ev;
      if (!dayIdxInRange.has(dateIdx)) continue;
      const evName = data.eventCatalog[evIdx] || '';
      if (!eventUvMap.has(evName)) eventUvMap.set(evName, new Set<number>());
      eventUvMap.get(evName)!.add(visitorIdx);

      if (evName === 'preview_play') {
        if (variantCode === 1) varA.plays.add(visitorIdx);
        else if (variantCode === 2) varB.plays.add(visitorIdx);
      } else if (evName === 'overlay_cta_click') {
        if (variantCode === 1) varA.clicks.add(visitorIdx);
        else if (variantCode === 2) varB.clicks.add(visitorIdx);
      } else if (evName === 'purchase_from_preview') {
        if (variantCode === 1) varA.purchases.add(visitorIdx);
        else if (variantCode === 2) varB.purchases.add(visitorIdx);
      }

      if (utmIdx >= 0) {
        let us = utmVisitorsMap.get(utmIdx);
        if (!us) {
          us = { pv: 0, uvSet: new Set<number>() };
          utmVisitorsMap.set(utmIdx, us);
        }
        us.pv += 1;
        us.uvSet.add(visitorIdx);
      }
    }

    // Trials & New Members in window
    const periodTrials = data.trials.filter(
      (t) => isAllTime || (t.dateKey >= startKey && t.dateKey <= endKey)
    );
    const periodNewMembers = data.members.filter(
      (m) => isAllTime || (m.createdDateKey >= startKey && m.createdDateKey <= endKey)
    );
    const prevNewMembers = data.members.filter(
      (m) => !isAllTime && m.createdDateKey >= prevStartKey && m.createdDateKey <= prevEndKey
    );
    const periodNewMembersWhoBought = periodNewMembers.filter((m) => m.hasPurchased).length;

    // Daily Series Array
    const dailySeries = Array.from(dailyMap.values()).map((b) => ({
      dateKey: b.dateKey,
      shortLabel: b.shortLabel,
      fullLabel: b.fullLabel,
      isWeekend: b.isWeekend,
      uv: b.uvSet.size,
      pv: b.pv,
      revenue: b.revenue,
      orders: b.orders,
    }));

    // Top Pages Array
    const topPages = Array.from(pageStatsMap.entries())
      .map(([pIdx, stat]) => {
        const info = data.pathCatalog[pIdx];
        return {
          pathname: info?.pathname || '',
          label: info?.label || '',
          category: info?.category || 'other',
          uv: stat.uvSet.size,
          pv: stat.pv,
        };
      })
      .sort((a, b) => b.uv - a.uv || b.pv - a.pv);

    // UTM Table with Checkout Reach Rate!
    const utmRows = Array.from(utmVisitorsMap.entries())
      .map(([uIdx, stat]) => {
        let checkoutReached = 0;
        stat.uvSet.forEach((vid) => {
          if (checkoutVisitorsSet.has(vid)) checkoutReached++;
        });
        const uv = stat.uvSet.size;
        return {
          utm: data.utmCatalog[uIdx] || '',
          uv,
          pv: stat.pv,
          checkoutUv: checkoutReached,
          checkoutRate: uv > 0 ? (checkoutReached / uv) * 100 : 0,
        };
      })
      .sort((a, b) => b.checkoutUv - a.checkoutUv || b.uv - a.uv || b.pv - a.pv);

    // Source Breakdown
    const sourceRows = Array.from(srcStatsMap.entries())
      .map(([sIdx, stat]) => {
        const rawKey = data.srcCatalog[sIdx] || 'other';
        let checkoutReached = 0;
        stat.uvSet.forEach((vid) => {
          if (checkoutVisitorsSet.has(vid)) checkoutReached++;
        });
        return {
          key: rawKey,
          label: SOURCE_LABELS[rawKey] || rawKey,
          uv: stat.uvSet.size,
          pv: stat.pv,
          checkoutUv: checkoutReached,
        };
      })
      .sort((a, b) => b.uv - a.uv);

    // Per-Tool Performance Matrix
    const salesBySlug = new Map<string, { count: number; revenue: number; buyers: UnifiedSaleRecord[] }>();
    for (const s of periodSales) {
      const cur = salesBySlug.get(s.toolSlug) || { count: 0, revenue: 0, buyers: [] };
      cur.count += 1;
      cur.revenue += s.amount;
      cur.buyers.push(s);
      salesBySlug.set(s.toolSlug, cur);
    }

    const trialsBySlug = new Map<string, number>();
    for (const tr of periodTrials) {
      trialsBySlug.set(tr.toolSlug, (trialsBySlug.get(tr.toolSlug) || 0) + 1);
    }

    const toolMatrix = data.toolsCatalog.map((tool) => {
      const toolUv = toolViewUvMap.get(tool.slug)?.size || 0;
      const checkoutUv = toolCheckoutUvMap.get(tool.slug)?.size || 0;
      const saleStat = salesBySlug.get(tool.slug) || { count: 0, revenue: 0, buyers: [] };
      const trialsCount = trialsBySlug.get(tool.slug) || 0;
      const denominator = Math.max(toolUv, checkoutUv);
      const convRate = denominator > 0 ? (saleStat.count / denominator) * 100 : 0;
      const checkoutToSaleRate = checkoutUv > 0 ? (saleStat.count / checkoutUv) * 100 : 0;

      return {
        ...tool,
        toolUv,
        checkoutUv,
        trialsCount,
        salesCount: saleStat.count,
        revenue: saleStat.revenue,
        convRate,
        checkoutToSaleRate,
        buyers: saleStat.buyers,
      };
    });

    // Hourly Golden Time summary
    const hourlySeries = hourlyTraffic.map((h) => ({
      hour: h.hour,
      label: `${String(h.hour).padStart(2, '0')}:00`,
      uv: h.uvSet.size,
      pv: h.pv,
      orders: h.orders,
      revenue: h.revenue,
    }));

    const peakTrafficHour = [...hourlySeries].sort((a, b) => b.uv - a.uv)[0];
    const peakOrderHour = [...hourlySeries].sort(
      (a, b) => b.orders - a.orders || b.revenue - a.revenue
    )[0];

    const totalUv = periodUvSet.size;
    const prevUv = prevUvSet.size;
    const previewPlayUv = eventUvMap.get('preview_play')?.size || 0;
    const engagedMidFunnelCount = previewPlayUv + periodTrials.length;

    const overallConvRate = totalUv > 0 ? (periodSales.length / totalUv) * 100 : 0;
    const revenuePerVisitor = totalUv > 0 ? periodRevenue / totalUv : 0;
    const aov = periodSales.length > 0 ? periodRevenue / periodSales.length : 0;

    return {
      allTimeRevenue,
      allTimeSalesCount: allTimeFilteredSales.length,
      periodRevenue,
      prevRevenue,
      periodSales,
      prevSalesCount: prevSales.length,
      aov,
      webAutoCount,
      webAdminCount,
      directKeyCount,
      totalUv,
      prevUv,
      periodPv,
      prevPv,
      overallConvRate,
      revenuePerVisitor,
      periodNewMembers,
      prevNewMembersCount: prevNewMembers.length,
      periodNewMembersWhoBought,
      dailySeries,
      topPages,
      utmRows,
      sourceRows,
      mobileUv: mobileUvSet.size,
      desktopUv: desktopUvSet.size,
      toolMatrix,
      hourlySeries,
      peakTrafficHour,
      peakOrderHour,
      funnel: {
        totalUv,
        productUv: productOrCourseUvSet.size,
        engagedCount: engagedMidFunnelCount,
        trialsCount: periodTrials.length,
        previewPlayUv,
        checkoutUv: checkoutUvSet.size,
        paidOrdersCount: periodSales.length,
        uniqueBuyersCount: uniqueBuyerSet.size,
        previewDetails: {
          playUv: previewPlayUv,
          unmuteUv: eventUvMap.get('preview_unmute')?.size || 0,
          q50Uv: eventUvMap.get('preview_50')?.size || 0,
          q100Uv: eventUvMap.get('preview_100')?.size || 0,
          sticky30sUv: eventUvMap.get('sticky_30s_cta_click')?.size || 0,
          overlayClickUv: eventUvMap.get('overlay_cta_click')?.size || 0,
          curriculumClickUv: eventUvMap.get('curriculum_click_from_preview')?.size || 0,
          varA: {
            plays: varA.plays.size,
            clicks: varA.clicks.size,
            purchases: varA.purchases.size,
          },
          varB: {
            plays: varB.plays.size,
            clicks: varB.clicks.size,
            purchases: varB.purchases.size,
          },
        },
      },
    };
  }, [data, dateWindow, channelFilter]);

  // 3. Single-Day Drill-Down Computation (when admin clicks any bar on the Daily Chart)
  const selectedDayDetail = useMemo(() => {
    if (!selectedDayKey) return null;
    const dayIdx = data.calendarDays.findIndex((d) => d.dateKey === selectedDayKey);
    if (dayIdx < 0) return null;
    const dayMeta = data.calendarDays[dayIdx];

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      uvSet: new Set<number>(),
      pv: 0,
      orders: 0,
      revenue: 0,
    }));

    const dayUvSet = new Set<number>();
    let dayPv = 0;
    const pageMap = new Map<number, { pv: number; uvSet: Set<number> }>();
    const utmMap = new Map<number, { pv: number; uvSet: Set<number> }>();

    for (const v of data.visits) {
      const [dIdx, hour, visitorIdx, pathIdx, utmIdx] = v;
      if (dIdx !== dayIdx) continue;
      dayPv += 1;
      dayUvSet.add(visitorIdx);
      if (hour >= 0 && hour <= 23) {
        hourly[hour].pv += 1;
        hourly[hour].uvSet.add(visitorIdx);
      }
      let pm = pageMap.get(pathIdx);
      if (!pm) {
        pm = { pv: 0, uvSet: new Set<number>() };
        pageMap.set(pathIdx, pm);
      }
      pm.pv += 1;
      pm.uvSet.add(visitorIdx);

      if (utmIdx >= 0) {
        let um = utmMap.get(utmIdx);
        if (!um) {
          um = { pv: 0, uvSet: new Set<number>() };
          utmMap.set(utmIdx, um);
        }
        um.pv += 1;
        um.uvSet.add(visitorIdx);
      }
    }

    const daySales = data.sales.filter(
      (s) => s.dateKey === selectedDayKey && matchesChannel(s.channel, channelFilter)
    );
    for (const s of daySales) {
      if (s.hour >= 0 && s.hour <= 23) {
        hourly[s.hour].orders += 1;
        hourly[s.hour].revenue += s.amount;
      }
    }

    const daySignups = data.members.filter((m) => m.createdDateKey === selectedDayKey);

    return {
      dayMeta,
      uv: dayUvSet.size,
      pv: dayPv,
      revenue: daySales.reduce((acc, s) => acc + s.amount, 0),
      sales: daySales,
      signups: daySignups,
      hourly: hourly.map((h) => ({
        hour: h.hour,
        label: h.label,
        uv: h.uvSet.size,
        pv: h.pv,
        orders: h.orders,
        revenue: h.revenue,
      })),
      topPages: Array.from(pageMap.entries())
        .map(([pIdx, st]) => ({
          pathname: data.pathCatalog[pIdx]?.pathname || '',
          label: data.pathCatalog[pIdx]?.label || '',
          uv: st.uvSet.size,
          pv: st.pv,
        }))
        .sort((a, b) => b.uv - a.uv || b.pv - a.pv)
        .slice(0, 8),
      topUtms: Array.from(utmMap.entries())
        .map(([uIdx, st]) => ({
          utm: data.utmCatalog[uIdx] || '',
          uv: st.uvSet.size,
          pv: st.pv,
        }))
        .sort((a, b) => b.uv - a.uv)
        .slice(0, 8),
    };
  }, [selectedDayKey, data, channelFilter]);

  // 4. Expanded Single-Tool Deep-Dive Computation
  const expandedToolDetail = useMemo(() => {
    if (!expandedToolSlug) return null;
    const toolRow = analytics.toolMatrix.find((t) => t.slug === expandedToolSlug);
    if (!toolRow) return null;

    const matchingPathIndices = new Set<number>();
    const checkoutPathIndices = new Set<number>();
    data.pathCatalog.forEach((p, idx) => {
      if (p.toolSlug === expandedToolSlug) {
        if (p.category === 'checkout') checkoutPathIndices.add(idx);
        else matchingPathIndices.add(idx);
      }
    });

    const utmForTool = new Map<number, Set<number>>();
    const recent14 = data.calendarDays.slice(-14);
    const recent14IdxToPos = new Map<number, number>();
    recent14.forEach((d, pos) => {
      const globalIdx = data.calendarDays.findIndex((cd) => cd.dateKey === d.dateKey);
      if (globalIdx >= 0) recent14IdxToPos.set(globalIdx, pos);
    });

    const daily14 = recent14.map((d) => ({
      dateKey: d.dateKey,
      shortLabel: d.shortLabel,
      viewUv: new Set<number>(),
      checkoutUv: new Set<number>(),
      sales: 0,
    }));

    for (const v of data.visits) {
      const [dIdx, , visitorIdx, pIdx, utmIdx] = v;
      const isView = matchingPathIndices.has(pIdx);
      const isCheckout = checkoutPathIndices.has(pIdx);
      if (!isView && !isCheckout) continue;

      if (utmIdx >= 0) {
        if (!utmForTool.has(utmIdx)) utmForTool.set(utmIdx, new Set<number>());
        utmForTool.get(utmIdx)!.add(visitorIdx);
      }

      const pos = recent14IdxToPos.get(dIdx);
      if (pos !== undefined) {
        if (isView) daily14[pos].viewUv.add(visitorIdx);
        if (isCheckout) daily14[pos].checkoutUv.add(visitorIdx);
      }
    }

    for (const s of data.sales) {
      if (s.toolSlug !== expandedToolSlug || !matchesChannel(s.channel, channelFilter)) continue;
      const d = daily14.find((item) => item.dateKey === s.dateKey);
      if (d) d.sales += 1;
    }

    const toolLeads = data.hotLeads.filter((l) => l.interestedToolSlug === expandedToolSlug);

    return {
      tool: toolRow,
      daily14: daily14.map((d) => ({
        dateKey: d.dateKey,
        shortLabel: d.shortLabel,
        viewUv: d.viewUv.size,
        checkoutUv: d.checkoutUv.size,
        sales: d.sales,
      })),
      topUtms: Array.from(utmForTool.entries())
        .map(([uIdx, set]) => ({ utm: data.utmCatalog[uIdx] || '', uv: set.size }))
        .sort((a, b) => b.uv - a.uv)
        .slice(0, 6),
      toolLeads: toolLeads.slice(0, 8),
    };
  }, [expandedToolSlug, analytics.toolMatrix, data, channelFilter]);

  // Sort Tool Matrix
  const sortedTools = useMemo(() => {
    const arr = [...analytics.toolMatrix];
    arr.sort((a, b) => {
      let diff = 0;
      if (toolSortKey === 'revenue') diff = b.revenue - a.revenue || b.salesCount - a.salesCount;
      else if (toolSortKey === 'sales') diff = b.salesCount - a.salesCount || b.revenue - a.revenue;
      else if (toolSortKey === 'toolUv') diff = b.toolUv - a.toolUv;
      else if (toolSortKey === 'checkoutUv') diff = b.checkoutUv - a.checkoutUv;
      else if (toolSortKey === 'convRate') diff = b.convRate - a.convRate || b.salesCount - a.salesCount;
      else if (toolSortKey === 'trials') diff = b.trialsCount - a.trialsCount;
      return toolSortAsc ? -diff : diff;
    });
    return arr;
  }, [analytics.toolMatrix, toolSortKey, toolSortAsc]);

  const handleSortTools = (key: ToolSortKey) => {
    if (toolSortKey === key) {
      setToolSortAsc((prev) => !prev);
    } else {
      setToolSortKey(key);
      setToolSortAsc(false);
    }
  };

  // Top VIP Customers
  const vipCustomers = useMemo(() => {
    return [...data.members]
      .filter((m) => m.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent || b.ordersCount - a.ordersCount)
      .slice(0, 20);
  }, [data.members]);

  // Filtered UTM Rows
  const filteredUtmRows = useMemo(() => {
    const q = utmQuery.trim().toLowerCase();
    if (!q) return analytics.utmRows.slice(0, 15);
    return analytics.utmRows.filter((r) => r.utm.toLowerCase().includes(q)).slice(0, 25);
  }, [analytics.utmRows, utmQuery]);

  // Chart scaling
  const visibleDailySeries =
    analytics.dailySeries.length > 45
      ? analytics.dailySeries.slice(-45)
      : analytics.dailySeries;
  const maxDailyUv = Math.max(...visibleDailySeries.map((d) => d.uv), 1);
  const maxDailyRev = Math.max(...visibleDailySeries.map((d) => d.revenue), 1);
  const maxHourlyUv = Math.max(...analytics.hourlySeries.map((h) => h.uv), 1);

  return (
    <div className="space-y-6 pb-10 tabular-nums">
      {/* Top Header & Global Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                ศูนย์วิเคราะห์ข้อมูลเชิงลึก (Analytics & Revenue Drill-Down)
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                เวลาไทย (Asia/Bangkok)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ประมวลผลจากข้อมูลผู้เข้าชมจริง {data.systemCounts.totalPvRowsLoaded.toLocaleString()} รายการ · สมาชิก{' '}
              {data.systemCounts.totalMembers.toLocaleString()} คน · อัปเดตเมื่อ{' '}
              {formatThaiDateTimeShort(data.generatedAtIso)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-950 border border-slate-800 p-1">
              {(
                [
                  ['all', 'รวมทุกช่องทาง'],
                  ['web', '🌐 หน้าเว็บ (สลิป)'],
                  ['direct', '💬 ออกคีย์ตรง'],
                ] as const
              ).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setChannelFilter(val)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    channelFilter === val
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => startTransition(() => router.refresh())}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              {isRefreshing ? 'กำลังรีเฟรช...' : '↻ รีเฟรชข้อมูลล่าสุด'}
            </button>
          </div>
        </div>

        {/* Time Range Presets */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['today', 'วันนี้'],
                ['yesterday', 'เมื่อวาน'],
                ['7d', '7 วันล่าสุด'],
                ['14d', '14 วัน'],
                ['30d', '30 วัน'],
                ['this_month', 'เดือนนี้'],
                ['all', 'ทั้งหมด (90 วัน)'],
                ['custom', 'เลือกวันเอง'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setPreset(key);
                  setSelectedDayKey(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  preset === key
                    ? 'bg-white text-slate-950 font-semibold'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="text-slate-400">ตั้งแต่</label>
              <input
                type="date"
                value={customStart}
                max={data.todayDateKey}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <label className="text-slate-400">ถึง</label>
              <input
                type="date"
                value={customEnd}
                max={data.todayDateKey}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Urgent Alert Banner if Pending or Unresolved Rejected Slips Exist */}
      {(data.systemCounts.pendingOrders > 0 ||
        data.attentionOrders.some(
          (o) => o.status === 'rejected' && o.rejectCategory === 'old_slip'
        )) && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-amber-200">
            <strong className="font-semibold text-amber-300">แจ้งเตือนรายการสลิป:</strong>{' '}
            {data.systemCounts.pendingOrders > 0
              ? `มีคำสั่งซื้อรอตรวจสอบ ${data.systemCounts.pendingOrders} รายการ `
              : ''}
            {data.attentionOrders.filter((o) => o.rejectCategory === 'old_slip').length > 0
              ? `และมีสลิปที่โอนเกิน 30 นาทีถูก AI ปฏิเสธ ${
                  data.attentionOrders.filter((o) => o.rejectCategory === 'old_slip').length
                } รายการ`
              : ''}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBottomTab('attention');
                document
                  .getElementById('dashboard-action-tabs')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-semibold transition-colors"
            >
              ดูรายการในหน้านี้
            </button>
            <Link
              href="/admin/orders"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
            >
              ไปหน้าจัดการออเดอร์ →
            </Link>
          </div>
        </div>
      )}

      {/* 6 High-Signal KPI Cards with Period-over-Period Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* KPI 1: Revenue in Period */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-emerald-300">
              รายได้ ({dateWindow.label})
            </span>
            {!dateWindow.isAllTime &&
              formatDeltaBadge(analytics.periodRevenue, analytics.prevRevenue)}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-white">
              {analytics.periodRevenue.toLocaleString()}
            </span>
            <span className="text-base font-semibold text-emerald-400">฿</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>สะสมทั้งหมด: {analytics.allTimeRevenue.toLocaleString()} ฿</span>
            <span>รวม {analytics.allTimeSalesCount.toLocaleString()} บิล</span>
          </div>
        </div>

        {/* KPI 2: Orders & AOV & Channel Mix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-cyan-300">
              บิลขายสำเร็จ & ยอดเฉลี่ย/บิล
            </span>
            {!dateWindow.isAllTime &&
              formatDeltaBadge(analytics.periodSales.length, analytics.prevSalesCount)}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div>
              <span className="text-3xl font-bold text-white">
                {analytics.periodSales.length.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 ml-1.5">บิล</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">เฉลี่ยต่อบิล (AOV)</span>
              <span className="text-base font-bold text-cyan-300">
                {Math.round(analytics.aov).toLocaleString()} ฿
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>🤖 AI สลิป: {analytics.webAutoCount}</span>
            <span>👤 แอดมินเว็บ: {analytics.webAdminCount}</span>
            <span>💬 คีย์ตรง: {analytics.directKeyCount}</span>
          </div>
        </div>

        {/* KPI 3: Unique Visitors & Pageviews */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-sky-300">
              ผู้เข้าชมไม่ซ้ำ (Unique Visitors)
            </span>
            {!dateWindow.isAllTime && formatDeltaBadge(analytics.totalUv, analytics.prevUv)}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div>
              <span className="text-3xl font-bold text-white">
                {analytics.totalUv.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 ml-1.5">คน</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">เปิดหน้ารวม (PV)</span>
              <span className="text-base font-bold text-slate-200">
                {analytics.periodPv.toLocaleString()} ครั้ง
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              เฉลี่ย{' '}
              {analytics.totalUv > 0
                ? (analytics.periodPv / analytics.totalUv).toFixed(1)
                : '0.0'}{' '}
              หน้า/คน
            </span>
            <span>
              มือถือ {analytics.mobileUv.toLocaleString()} · คอม {analytics.desktopUv.toLocaleString()}
            </span>
          </div>
        </div>

        {/* KPI 4: Conversion Rate & Revenue Per Visitor (Ad Spend North Star) */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-amber-300">
              อัตราปิดการขาย & มูลค่าต่อคนเข้าชม
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/25">
              ตัวชี้วัดยิงแอด
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div>
              <span className="text-3xl font-bold text-white">
                {analytics.overallConvRate.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-400 ml-1.5">UV ➔ ซื้อ</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">รายได้/ผู้เข้าชม 1 คน</span>
              <span className="text-base font-bold text-amber-300">
                {analytics.revenuePerVisitor.toFixed(1)} ฿/คน
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>เข้าหน้า /checkout: {analytics.funnel.checkoutUv.toLocaleString()} คน</span>
            <span>
              Checkout ➔ ซื้อ:{' '}
              {analytics.funnel.checkoutUv > 0
                ? Math.min(
                    100,
                    (analytics.periodSales.length / analytics.funnel.checkoutUv) * 100
                  ).toFixed(1)
                : '0.0'}
              %
            </span>
          </div>
        </div>

        {/* KPI 5: New Members & Buyer Conversion */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-indigo-300">
              สมาชิกสมัครใหม่ ({dateWindow.label})
            </span>
            {!dateWindow.isAllTime &&
              formatDeltaBadge(
                analytics.periodNewMembers.length,
                analytics.prevNewMembersCount
              )}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div>
              <span className="text-3xl font-bold text-white">
                {analytics.periodNewMembers.length.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400 ml-1.5">บัญชี</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">ซื้อแล้ว</span>
              <span className="text-base font-bold text-emerald-300">
                {analytics.periodNewMembersWhoBought.toLocaleString()} คน
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>สมาชิกทั้งหมดในระบบ: {data.systemCounts.totalMembers.toLocaleString()} คน</span>
            <Link href="/admin/members" className="text-indigo-300 hover:underline">
              ดูรายชื่อ →
            </Link>
          </div>
        </div>

        {/* KPI 6: Inventory & Order Queue Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-slate-300">
              สุขภาพระบบ & คลังเครื่องมือ
            </span>
            <span className="text-xs text-slate-400">
              เปิดขาย {data.systemCounts.activeTools}/{data.systemCounts.totalTools} ตัว
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-1">
              <div className="text-[11px] text-slate-400">รอตรวจสลิป</div>
              <div
                className={`text-lg font-bold ${
                  data.systemCounts.pendingOrders > 0 ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {data.systemCounts.pendingOrders}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-1">
              <div className="text-[11px] text-slate-400">สลิปไม่ผ่าน</div>
              <div
                className={`text-lg font-bold ${
                  data.systemCounts.rejectedOrdersCount > 0 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {data.systemCounts.rejectedOrdersCount}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-1">
              <div className="text-[11px] text-slate-400">Hot Leads</div>
              <div className="text-lg font-bold text-cyan-300">{data.hotLeads.length}</div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              คีย์ใช้งานแล้ว {data.systemCounts.activatedKeys}/{data.systemCounts.totalKeys}
            </span>
            <Link href="/admin/orders" className="text-cyan-400 hover:underline">
              จัดการออเดอร์ →
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 2: Interactive Daily Trend Chart + Click-to-Inspect Day Drawer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-white">
              แนวโน้มรายวัน — คลิกที่แท่งวันใดก็ได้เพื่อเจาะลึกรายชั่วโมงและบิลของวันนั้น
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              แสดงข้อมูลครบทุกวันจากฐานข้อมูลจริง (ปลดล็อกเพดาน 1,000 แถวเรียบร้อยแล้ว) · คลิกซ้ำที่แท่งเดิมเพื่อปิดแผงเจาะลึก
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-950 border border-slate-800 p-1 self-start">
            {(
              [
                ['combined', '⚡ คนเข้าคู่ยอดขาย'],
                ['visitors', '👁️ ผู้เข้าชม (UV/PV)'],
                ['revenue', '💰 รายได้รายวัน (฿)'],
              ] as const
            ).map(([m, lbl]) => (
              <button
                key={m}
                type="button"
                onClick={() => setChartMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartMode === m
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Bar Chart */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 overflow-x-auto">
          <div
            className="flex items-end gap-1.5 min-h-[190px]"
            style={{ minWidth: `${Math.max(visibleDailySeries.length * 44, 320)}px` }}
          >
            {visibleDailySeries.map((d) => {
              const isSelected = selectedDayKey === d.dateKey;
              const uvHeight = Math.max((d.uv / maxDailyUv) * 120, d.uv > 0 ? 8 : 3);
              const revHeight = Math.max((d.revenue / maxDailyRev) * 120, d.revenue > 0 ? 8 : 3);

              return (
                <button
                  key={d.dateKey}
                  type="button"
                  onClick={() =>
                    setSelectedDayKey((cur) => (cur === d.dateKey ? null : d.dateKey))
                  }
                  className={`group flex-1 min-w-[36px] flex flex-col items-center rounded-xl px-1 pt-2 pb-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isSelected
                      ? 'bg-cyan-500/15 border border-cyan-400/50'
                      : 'hover:bg-slate-900 border border-transparent'
                  }`}
                  title={`${d.fullLabel} — ผู้เข้าชม ${d.uv} คน (${d.pv} PV) · ยอดขาย ${d.revenue.toLocaleString()} ฿ (${d.orders} บิล)`}
                >
                  {/* Top Metric Label */}
                  <div className="text-[10px] leading-tight text-center mb-1.5 space-y-0.5">
                    {(chartMode === 'visitors' || chartMode === 'combined') && (
                      <div className="text-cyan-300 font-semibold">
                        {d.uv > 0 ? d.uv.toLocaleString() : '0'}
                      </div>
                    )}
                    {(chartMode === 'revenue' || chartMode === 'combined') && d.revenue > 0 && (
                      <div className="text-emerald-300 font-semibold">
                        {d.revenue >= 1000
                          ? `${(d.revenue / 1000).toFixed(1)}k`
                          : d.revenue}
                      </div>
                    )}
                  </div>

                  {/* Bar Pair */}
                  <div className="w-full h-[124px] flex items-end justify-center gap-1 px-0.5">
                    {(chartMode === 'visitors' || chartMode === 'combined') && (
                      <div
                        className={`flex-1 max-w-[18px] rounded-t-md transition-all ${
                          isSelected
                            ? 'bg-cyan-300'
                            : d.uv > 0
                              ? 'bg-cyan-500/85 group-hover:bg-cyan-400'
                              : 'bg-slate-800'
                        }`}
                        style={{ height: `${uvHeight}px` }}
                      />
                    )}
                    {(chartMode === 'revenue' || chartMode === 'combined') && (
                      <div
                        className={`flex-1 max-w-[18px] rounded-t-md transition-all ${
                          isSelected
                            ? 'bg-emerald-300'
                            : d.revenue > 0
                              ? 'bg-emerald-500/85 group-hover:bg-emerald-400'
                              : 'bg-slate-800/60'
                        }`}
                        style={{ height: `${revHeight}px` }}
                      />
                    )}
                  </div>

                  {/* Date Label */}
                  <div
                    className={`mt-1.5 text-[10px] whitespace-nowrap ${
                      isSelected
                        ? 'text-white font-bold'
                        : d.isWeekend
                          ? 'text-amber-300/80'
                          : 'text-slate-400'
                    }`}
                  >
                    {d.shortLabel}
                  </div>
                  <div className="text-[9px] text-slate-500 whitespace-nowrap">
                    {chartMode === 'revenue' ? `${d.orders} บิล` : `${d.pv} PV`}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" /> ผู้เข้าชมไม่ซ้ำ (UV)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> รายได้จริง (฿)
              </span>
              <span className="text-amber-300/80">สีเหลือง = วันเสาร์-อาทิตย์</span>
            </div>
            <span>คลิกที่แท่งวันใดก็ได้เพื่อเปิดตารางเจาะลึก 24 ชั่วโมงของวันนั้น</span>
          </div>
        </div>

        {/* Inline Single-Day Drill-Down Panel */}
        {selectedDayDetail && (
          <div className="mt-4 bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 md:p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    เจาะลึกรายวัน
                  </span>
                  <h3 className="text-base font-bold text-white">
                    วัน{selectedDayDetail.dayMeta.fullLabel} ({selectedDayDetail.dayMeta.dateKey})
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  ผู้เข้าชม {selectedDayDetail.uv.toLocaleString()} คน ({selectedDayDetail.pv.toLocaleString()} PV) ·
                  ขายได้ {selectedDayDetail.sales.length} บิล ({selectedDayDetail.revenue.toLocaleString()} ฿) ·
                  สมัครสมาชิกใหม่ {selectedDayDetail.signups.length} คน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 self-start"
              >
                ✕ ปิดมุมมองรายวัน
              </button>
            </div>

            {/* 24-Hour Breakdown of Selected Day */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2.5">
                กราฟรายชั่วโมง (00:00–23:00 น.) ของวันที่ {selectedDayDetail.dayMeta.shortLabel}
              </h4>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 min-w-[600px] h-28 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                  {selectedDayDetail.hourly.map((h) => {
                    const maxDayH = Math.max(
                      ...selectedDayDetail.hourly.map((x) => x.uv),
                      1
                    );
                    const barH = Math.max((h.uv / maxDayH) * 64, h.uv > 0 ? 6 : 2);
                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center"
                        title={`${h.label} น. — เข้าชม ${h.uv} คน (${h.pv} PV) · ซื้อ ${h.orders} บิล (${h.revenue.toLocaleString()} ฿)`}
                      >
                        <div className="text-[9px] text-slate-400 mb-1">
                          {h.orders > 0 ? (
                            <span className="text-emerald-300 font-bold">+{h.orders}฿</span>
                          ) : h.uv > 0 ? (
                            h.uv
                          ) : (
                            ''
                          )}
                        </div>
                        <div
                          className={`w-full max-w-[16px] rounded-t ${
                            h.orders > 0
                              ? 'bg-emerald-400'
                              : h.uv > 0
                                ? 'bg-cyan-500/80'
                                : 'bg-slate-800'
                          }`}
                          style={{ height: `${barH}px` }}
                        />
                        <div className="text-[9px] text-slate-500 mt-1">
                          {String(h.hour).padStart(2, '0')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3 Columns: Top Pages of Day | Top UTMs of Day | Sales & Signups of Day */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-cyan-300 mb-2">
                  หน้าที่คนเข้าดูในวันนั้น
                </h4>
                {selectedDayDetail.topPages.length === 0 ? (
                  <p className="text-xs text-slate-500">ไม่มีข้อมูลการเปิดหน้าเว็บในวันนี้</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDayDetail.topPages.map((p) => (
                      <div
                        key={p.pathname}
                        className="flex items-center justify-between text-xs bg-slate-950/80 px-2.5 py-1.5 rounded-lg gap-2"
                      >
                        <span className="text-slate-300 truncate">{p.label}</span>
                        <span className="text-cyan-300 shrink-0 font-medium">
                          {p.uv} คน <span className="text-slate-500">({p.pv})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-amber-300 mb-2">
                  แอด / UTM ในวันนั้น
                </h4>
                {selectedDayDetail.topUtms.length === 0 ? (
                  <p className="text-xs text-slate-500">ไม่มีพารามิเตอร์ UTM ในวันนี้</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDayDetail.topUtms.map((u) => (
                      <div
                        key={u.utm}
                        className="flex items-center justify-between text-xs bg-slate-950/80 px-2.5 py-1.5 rounded-lg gap-2"
                      >
                        <span className="text-amber-200 font-mono truncate">{u.utm}</span>
                        <span className="text-slate-200 shrink-0">
                          {u.uv} คน <span className="text-slate-500">({u.pv})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-emerald-300 mb-2">
                  บิลขายสำเร็จในวันนั้น ({selectedDayDetail.sales.length})
                </h4>
                {selectedDayDetail.sales.length === 0 ? (
                  <p className="text-xs text-slate-500">ไม่มีรายการขายในวันนี้</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedDayDetail.sales.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs bg-slate-950/80 px-2.5 py-1.5 rounded-lg gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-slate-200 truncate font-medium">
                            {s.toolName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {String(s.hour).padStart(2, '0')}:00 น. · {s.email || '-'}
                          </div>
                        </div>
                        <span className="text-emerald-400 font-semibold shrink-0">
                          +{s.amount.toLocaleString()} ฿
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: 5-Stage Conversion Funnel + Top Pages Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 7 cols: Full Conversion Funnel */}
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-white">
                  กรวยการตัดสินใจซื้อ (Conversion Funnel — {dateWindow.label})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  วิเคราะห์สัดส่วนผู้เข้าชมตั้งแต่เปิดเว็บจนถึงโอนเงินสำเร็จ เพื่อหาจุดที่ลูกค้าหลุดออกมากที่สุด
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewSubFunnel((v) => !v)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-amber-300 transition-colors"
              >
                {showPreviewSubFunnel
                  ? 'ซ่อนสถิติคลิปบทที่ 21 ▲'
                  : '🎬 เจาะลึกคลิปบทที่ 21 & A/B ▼'}
              </button>
            </div>

            {/* Funnel Bars */}
            <div className="space-y-3">
              {[
                {
                  step: '1. เข้าชมเว็บไซต์ทั้งหมด (Unique Visitors)',
                  count: analytics.funnel.totalUv,
                  base: analytics.funnel.totalUv,
                  prev: analytics.funnel.totalUv,
                  barColor: 'bg-sky-500',
                  unit: 'คน',
                },
                {
                  step: '2. เข้าดูหน้าสินค้า / เครื่องมือ AI / คอร์สเรียน',
                  count: analytics.funnel.productUv,
                  base: analytics.funnel.totalUv,
                  prev: analytics.funnel.totalUv,
                  barColor: 'bg-cyan-500',
                  unit: 'คน',
                },
                {
                  step: `3. มีส่วนร่วม (เล่นคลิปตัวอย่าง ${analytics.funnel.previewPlayUv} + ขอ Trial ${analytics.funnel.trialsCount})`,
                  count: analytics.funnel.engagedCount,
                  base: analytics.funnel.totalUv,
                  prev: Math.max(analytics.funnel.productUv, 1),
                  barColor: 'bg-indigo-500',
                  unit: 'รายการ',
                },
                {
                  step: '4. กดเข้าหน้าชำระเงิน (/checkout/*)',
                  count: analytics.funnel.checkoutUv,
                  base: analytics.funnel.totalUv,
                  prev: Math.max(analytics.funnel.productUv, 1),
                  barColor: 'bg-amber-500',
                  unit: 'คน',
                },
                {
                  step: '5. ชำระเงินสำเร็จ (บิลอนุมัติแล้ว)',
                  count: analytics.funnel.paidOrdersCount,
                  base: analytics.funnel.totalUv,
                  prev: Math.max(analytics.funnel.checkoutUv, 1),
                  barColor: 'bg-emerald-500',
                  unit: 'บิล',
                },
              ].map((stage, idx) => {
                const pctOfTotal =
                  stage.base > 0
                    ? Math.min(100, (stage.count / stage.base) * 100)
                    : 0;
                const pctOfPrev =
                  idx === 0
                    ? 100
                    : stage.prev > 0
                      ? Math.min(100, (stage.count / stage.prev) * 100)
                      : 0;
                return (
                  <div
                    key={stage.step}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="font-medium text-slate-200">{stage.step}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {stage.count.toLocaleString()} {stage.unit}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {pctOfTotal.toFixed(1)}% ของทั้งหมด
                        </span>
                        {idx > 0 && (
                          <span className="text-[11px] text-cyan-300">
                            (ไปต่อ {pctOfPrev.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stage.barColor} transition-all`}
                        style={{ width: `${Math.max(pctOfTotal, stage.count > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expandable Lesson 21 Video Preview Funnel */}
            {showPreviewSubFunnel && (
              <div className="mt-4 bg-slate-950 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-amber-300">
                    สถิติวิดีโอตัวอย่างบทที่ 21 (1 นาที) & ผลทดสอบ A/B
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    A: {analytics.funnel.previewDetails.varA.plays}/{data.abMinSamplePerVariant} UV · B:{' '}
                    {analytics.funnel.previewDetails.varB.plays}/{data.abMinSamplePerVariant} UV
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
                  {[
                    ['เริ่มเล่น', analytics.funnel.previewDetails.playUv],
                    ['เปิดเสียง', analytics.funnel.previewDetails.unmuteUv],
                    ['ดูถึง 50%', analytics.funnel.previewDetails.q50Uv],
                    ['ดูจบ 100%', analytics.funnel.previewDetails.q100Uv],
                    ['กดปุ่ม 30s', analytics.funnel.previewDetails.sticky30sUv],
                    ['กดตอนจบ', analytics.funnel.previewDetails.overlayClickUv],
                    ['กดดูสารบัญ', analytics.funnel.previewDetails.curriculumClickUv],
                  ].map(([lbl, val]) => (
                    <div
                      key={String(lbl)}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-2"
                    >
                      <div className="text-[10px] text-slate-400">{lbl}</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {Number(val).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: Full Top Pages Leaderboard */}
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="mb-3">
            <h2 className="text-base md:text-lg font-bold text-white">
              หน้าที่มีคนเข้าดูสูงสุด ({dateWindow.label})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              เรียงตามจำนวนผู้เข้าชมไม่ซ้ำ (Unique Visitors) แยกหมวดหน้าชัดเจน
            </p>
          </div>

          {analytics.topPages.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              ยังไม่มีข้อมูลการเข้าชมในช่วงเวลานี้
            </p>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {analytics.topPages.slice(0, 15).map((p, idx) => {
                const maxPageUv = analytics.topPages[0]?.uv || 1;
                const widthPct = (p.uv / maxPageUv) * 100;
                return (
                  <div
                    key={p.pathname}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-500 w-4 shrink-0">{idx + 1}.</span>
                        <span className="text-slate-200 font-medium truncate" title={p.pathname}>
                          {p.label}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-cyan-300 font-semibold">
                          {p.uv.toLocaleString()} คน
                        </span>
                        <span className="text-slate-500 ml-1">({p.pv.toLocaleString()} PV)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.category === 'checkout'
                            ? 'bg-emerald-500'
                            : p.category === 'course'
                              ? 'bg-amber-500'
                              : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.max(widthPct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Product & Tool Performance Matrix (Sortable + Click Row to Drill Down) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-white">
              ตารางเจาะลึกผลงานรายสินค้า & อัตราปิดการขาย ({dateWindow.label})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              คลิกที่หัวตารางเพื่อเรียงลำดับ · คลิกที่แถวสินค้าใดก็ได้เพื่อกางดูกราฟ 14 วัน, แอด UTM และรายชื่อลูกค้าของสินค้านั้น
            </p>
          </div>
          <span className="text-xs text-slate-400">
            คลิกแถวสินค้าเพื่อเจาะลึก
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs md:text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">สินค้า / เครื่องมือ AI</th>
                <th className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortTools('toolUv')}
                    className="hover:text-white font-semibold"
                  >
                    คนดูหน้าสินค้า {toolSortKey === 'toolUv' ? (toolSortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortTools('checkoutUv')}
                    className="hover:text-white font-semibold"
                  >
                    เข้า /checkout {toolSortKey === 'checkoutUv' ? (toolSortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortTools('trials')}
                    className="hover:text-white font-semibold"
                  >
                    ขอ Trial {toolSortKey === 'trials' ? (toolSortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortTools('sales')}
                    className="hover:text-white font-semibold"
                  >
                    ขายได้ (บิล) {toolSortKey === 'sales' ? (toolSortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortTools('convRate')}
                    className="hover:text-white font-semibold"
                  >
                    % ปิดการขาย {toolSortKey === 'convRate' ? (toolSortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSortTools('revenue')}
                    className="hover:text-white font-semibold text-emerald-300"
                  >
                    รายได้รวม {toolSortKey === 'revenue' ? (toolSortAsc ? '↑' : '↓') : ''}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {sortedTools.map((t) => {
                const isExpanded = expandedToolSlug === t.slug;
                return (
                  <React.Fragment key={t.id}>
                    <tr
                      onClick={() =>
                        setExpandedToolSlug((cur) => (cur === t.slug ? null : t.slug))
                      }
                      className={`cursor-pointer transition-colors ${
                        isExpanded
                          ? 'bg-cyan-500/10'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg shrink-0">{t.icon}</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate max-w-[280px] sm:max-w-md">
                              {t.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>/{t.slug}</span>
                              <span>· ราคาป้าย {t.priceNum.toLocaleString()} ฿</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-cyan-300 font-medium">
                        {t.toolUv.toLocaleString()} คน
                      </td>
                      <td className="px-3 py-3 text-right text-amber-300 font-medium">
                        {t.checkoutUv.toLocaleString()} คน
                      </td>
                      <td className="px-3 py-3 text-right text-slate-300">
                        {t.trialsCount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-white">
                        {t.salesCount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            t.convRate >= 5
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : t.convRate > 0
                                ? 'bg-cyan-500/15 text-cyan-300'
                                : 'text-slate-500'
                          }`}
                        >
                          {t.convRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">
                        {t.revenue.toLocaleString()} ฿
                      </td>
                    </tr>

                    {/* Inline Expanded Product Deep-Dive Row */}
                    {isExpanded && expandedToolDetail && (
                      <tr className="bg-slate-950">
                        <td colSpan={7} className="p-4 md:p-5 border-t border-cyan-500/30">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-semibold text-cyan-300">
                              เจาะลึกรายสินค้า: {t.name}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <Link
                                href={
                                  t.slug === 'tiktok-ai-affiliate'
                                    ? '/courses'
                                    : `/tool/${t.slug}`
                                }
                                target="_blank"
                                className="text-cyan-400 hover:underline"
                              >
                                เปิดหน้าสินค้าจริง ↗
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedToolSlug(null);
                                }}
                                className="text-slate-400 hover:text-white"
                              >
                                ✕ ย่อเก็บ
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* 14-day spark trend */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                              <div className="text-xs font-semibold text-slate-300 mb-2">
                                คนเข้าดู vs ซื้อจริง (14 วันล่าสุด)
                              </div>
                              <div className="flex items-end gap-1 h-24">
                                {expandedToolDetail.daily14.map((d) => {
                                  const maxV = Math.max(
                                    ...expandedToolDetail.daily14.map((x) => x.viewUv),
                                    1
                                  );
                                  const hPx = Math.max(
                                    (d.viewUv / maxV) * 60,
                                    d.viewUv > 0 ? 5 : 2
                                  );
                                  return (
                                    <div
                                      key={d.dateKey}
                                      className="flex-1 flex flex-col items-center"
                                      title={`${d.shortLabel}: ดู ${d.viewUv} คน · เข้าจ่ายเงิน ${d.checkoutUv} คน · ซื้อ ${d.sales} บิล`}
                                    >
                                      <div className="text-[9px] text-slate-400 mb-0.5">
                                        {d.sales > 0 ? (
                                          <span className="text-emerald-300 font-bold">
                                            +{d.sales}
                                          </span>
                                        ) : d.viewUv > 0 ? (
                                          d.viewUv
                                        ) : (
                                          ''
                                        )}
                                      </div>
                                      <div
                                        className={`w-full rounded-t ${
                                          d.sales > 0
                                            ? 'bg-emerald-400'
                                            : d.viewUv > 0
                                              ? 'bg-cyan-500/80'
                                              : 'bg-slate-800'
                                        }`}
                                        style={{ height: `${hPx}px` }}
                                      />
                                      <div className="text-[8px] text-slate-500 mt-1 truncate max-w-full">
                                        {d.shortLabel.split(' ')[0]}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Top UTMs for this Tool */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                              <div className="text-xs font-semibold text-amber-300 mb-2">
                                แคมเปญ / UTM ที่พาคนมาดูสินค้านี้
                              </div>
                              {expandedToolDetail.topUtms.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                  ส่วนใหญ่เข้าผ่านหน้าแรก / ค้นหาโดยตรง
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {expandedToolDetail.topUtms.map((u) => (
                                    <div
                                      key={u.utm}
                                      className="flex items-center justify-between text-xs bg-slate-950 px-2.5 py-1.5 rounded-lg"
                                    >
                                      <span className="text-amber-200 font-mono truncate">
                                        {u.utm}
                                      </span>
                                      <span className="text-slate-200 shrink-0">{u.uv} คน</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Buyers & Unconverted Trial Leads for this Tool */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                              <div className="text-xs font-semibold text-emerald-300 mb-2">
                                ลูกค้าที่ซื้อล่าสุด ({t.buyers.length}) & ผู้ขอ Trial ที่ยังไม่ซื้อ (
                                {expandedToolDetail.toolLeads.length})
                              </div>
                              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                {t.buyers.slice(0, 5).map((b) => (
                                  <div
                                    key={b.id}
                                    className="flex items-center justify-between text-xs bg-slate-950 px-2.5 py-1 rounded-lg"
                                  >
                                    <span className="text-slate-200 truncate">
                                      ✅ {b.email || 'ไม่ระบุอีเมล'}
                                    </span>
                                    <span className="text-emerald-400 shrink-0">
                                      {b.amount.toLocaleString()} ฿
                                    </span>
                                  </div>
                                ))}
                                {expandedToolDetail.toolLeads.map((ld) => (
                                  <div
                                    key={ld.email}
                                    className="flex items-center justify-between text-xs bg-slate-950 px-2.5 py-1 rounded-lg"
                                  >
                                    <span className="text-amber-200 truncate">
                                      🔥 สนใจ: {ld.email}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyEmail(ld.email);
                                      }}
                                      className="text-cyan-300 hover:underline shrink-0 ml-2"
                                    >
                                      {copiedEmail === ld.email ? 'คัดลอกแล้ว' : 'คัดลอก'}
                                    </button>
                                  </div>
                                ))}
                                {t.buyers.length === 0 &&
                                  expandedToolDetail.toolLeads.length === 0 && (
                                    <p className="text-xs text-slate-500">
                                      ยังไม่มีรายการซื้อในช่วงเวลานี้
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: Traffic Sources / UTM Campaign Attribution + 24-Hour Golden Time */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* UTM & Channel Attribution */}
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base md:text-lg font-bold text-white">
                เจาะลึกแคมเปญแอด (UTM Content) & แหล่งที่มา ({dateWindow.label})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                วัดว่าแอดหรือแบนเนอร์ตัวไหนพาคนเดินไปถึงหน้าชำระเงิน (`/checkout`) ได้จริงกี่ %
              </p>
            </div>
            <input
              type="search"
              value={utmQuery}
              onChange={(e) => setUtmQuery(e.target.value)}
              placeholder="ค้นหาชื่อ UTM..."
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Source Chips */}
          {analytics.sourceRows.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {analytics.sourceRows.map((src) => (
                <div
                  key={src.key}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2"
                >
                  <span className="text-slate-300 font-medium">{src.label}</span>
                  <span className="text-cyan-300 font-bold">{src.uv} คน</span>
                  {src.checkoutUv > 0 && (
                    <span className="text-emerald-400 text-[11px]">
                      (เข้าจ่ายเงิน {src.checkoutUv})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredUtmRows.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              ไม่พบข้อมูล UTM ในช่วงเวลานี้ (แนบ `?utm_content=ชื่อแอด` ในลิงก์โฆษณาเพื่อวัดผลแยกแคมเปญ)
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">ชื่อแคมเปญ (utm_content)</th>
                    <th className="px-3 py-2.5 text-right">คนเข้า (UV)</th>
                    <th className="px-3 py-2.5 text-right">เปิดหน้า (PV)</th>
                    <th className="px-3 py-2.5 text-right">ถึงหน้าจ่ายเงิน</th>
                    <th className="px-3.5 py-2.5 text-right">% เข้าจ่ายเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredUtmRows.map((row) => (
                    <tr key={row.utm} className="hover:bg-slate-800/40">
                      <td className="px-3.5 py-2 font-mono text-amber-300">{row.utm}</td>
                      <td className="px-3 py-2 text-right font-semibold text-white">
                        {row.uv.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {row.pv.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-300">
                        {row.checkoutUv.toLocaleString()} คน
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            row.checkoutRate >= 15
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : row.checkoutRate > 0
                                ? 'bg-cyan-500/15 text-cyan-300'
                                : 'text-slate-500'
                          }`}
                        >
                          {row.checkoutRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 24-Hour Golden Time Chart */}
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-white">
              ช่วงเวลาทอง 24 ชั่วโมง (Golden Hours — {dateWindow.label})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              เทียบชั่วโมงที่คนเข้าเว็บมากที่สุด vs ชั่วโมงที่ลูกค้าโอนเงินจริง เพื่อจัดงบยิงแอดให้ตรงเวลา
            </p>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">คนเข้าเว็บพีคสุด</div>
                <div className="text-base font-bold text-cyan-300 mt-0.5">
                  {analytics.peakTrafficHour && analytics.peakTrafficHour.uv > 0
                    ? `${analytics.peakTrafficHour.label} น. (${analytics.peakTrafficHour.uv} คน)`
                    : 'ยังไม่มีข้อมูล'}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">โอนเงินซื้อพีคสุด</div>
                <div className="text-base font-bold text-emerald-300 mt-0.5">
                  {analytics.peakOrderHour && analytics.peakOrderHour.orders > 0
                    ? `${analytics.peakOrderHour.label} น. (${analytics.peakOrderHour.orders} บิล)`
                    : 'ยังไม่มีข้อมูล'}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 overflow-x-auto">
              <div className="flex items-end gap-1 min-w-[420px] h-36">
                {analytics.hourlySeries.map((h) => {
                  const barH = Math.max((h.uv / maxHourlyUv) * 96, h.uv > 0 ? 5 : 2);
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 flex flex-col items-center"
                      title={`${h.label} น. — เข้าชม ${h.uv} คน (${h.pv} PV) · ขายได้ ${h.orders} บิล (${h.revenue.toLocaleString()} ฿)`}
                    >
                      <div className="text-[9px] mb-1">
                        {h.orders > 0 ? (
                          <span className="text-emerald-300 font-bold">+{h.orders}</span>
                        ) : (
                          ''
                        )}
                      </div>
                      <div
                        className={`w-full rounded-t ${
                          h.orders > 0
                            ? 'bg-emerald-400'
                            : h.uv > 0
                              ? 'bg-cyan-500/80'
                              : 'bg-slate-800'
                        }`}
                        style={{ height: `${barH}px` }}
                      />
                      <div className="text-[9px] text-slate-500 mt-1">
                        {h.hour % 2 === 0 ? String(h.hour).padStart(2, '0') : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>แท่งสีเขียว = ชั่วโมงที่มีคำสั่งซื้อเกิดขึ้นจริง</span>
                <span>00:00 – 23:00 น.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: Operational Customer & Order Action Tabs */}
      <div
        id="dashboard-action-tabs"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['sales', `🧾 บิลขายสำเร็จ (${analytics.periodSales.length})`],
                [
                  'attention',
                  `⚠️ สลิปรอตรวจ / ไม่ผ่าน (${data.attentionOrders.length})`,
                ],
                ['leads', `🔥 Hot Leads น่าทักปิดการขาย (${data.hotLeads.length})`],
                ['vip', `👑 ลูกค้า VIP สูงสุด (${vipCustomers.length})`],
              ] as const
            ).map(([tabKey, tabLabel]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setBottomTab(tabKey)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  bottomTab === tabKey
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-600'
                }`}
              >
                {tabLabel}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link href="/admin/orders" className="text-cyan-400 hover:underline">
              หน้าออเดอร์ทั้งหมด →
            </Link>
            <Link href="/admin/trials" className="text-amber-300 hover:underline">
              หน้า CRM ทดลองใช้ →
            </Link>
          </div>
        </div>

        {/* Tab 1: Period Approved Sales */}
        {bottomTab === 'sales' && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-96 overflow-y-auto">
            {analytics.periodSales.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                ไม่มีรายการขายในช่วงเวลาที่เลือก
              </p>
            ) : (
              <table className="w-full text-left text-xs md:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">วัน-เวลา (ไทย)</th>
                    <th className="px-3 py-2.5">อีเมลลูกค้า</th>
                    <th className="px-3 py-2.5">สินค้า</th>
                    <th className="px-3 py-2.5">ช่องทางอนุมัติ</th>
                    <th className="px-3 py-2.5">รหัสคีย์</th>
                    <th className="px-4 py-2.5 text-right">ยอดเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {analytics.periodSales.slice(0, 50).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                        {formatThaiDateTimeShort(s.dateIso)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-white">
                        {s.email || '-'}
                      </td>
                      <td className="px-3 py-2.5">{s.toolName}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            s.channel === 'web_auto_slip'
                              ? 'bg-cyan-500/15 text-cyan-300'
                              : s.channel === 'web_admin'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {s.actorLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                        {s.keyCode || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                        +{s.amount.toLocaleString()} ฿
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Attention Orders (Pending & Rejected Slips) */}
        {bottomTab === 'attention' && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-96 overflow-y-auto">
            {data.attentionOrders.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                ไม่มีสลิปรอตรวจสอบหรือถูกปฏิเสธในขณะนี้
              </p>
            ) : (
              <table className="w-full text-left text-xs md:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">วัน-เวลา</th>
                    <th className="px-3 py-2.5">อีเมลลูกค้า</th>
                    <th className="px-3 py-2.5">รายการ</th>
                    <th className="px-3 py-2.5">สถานะ / สาเหตุ</th>
                    <th className="px-4 py-2.5 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {data.attentionOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                        {formatThaiDateTimeShort(o.createdAtIso)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-white">{o.email}</td>
                      <td className="px-3 py-2.5">
                        <div>{o.toolName}</div>
                        <div className="text-[11px] text-amber-300">
                          {o.amount.toLocaleString()} ฿
                        </div>
                      </td>
                      <td className="px-3 py-2.5 max-w-md">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold mb-1 ${
                            o.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {o.status === 'pending'
                            ? '⏳ รอตรวจสอบ'
                            : o.rejectCategory === 'old_slip'
                              ? '⏰ สลิปโอนเกิน 30 นาที'
                              : o.rejectCategory === 'wrong_amount'
                                ? '💰 ยอดเงินไม่ตรง'
                                : o.rejectCategory === 'duplicate_slip'
                                  ? '🔁 สลิปซ้ำ'
                                  : '❌ ปฏิเสธ/ยกเลิก'}
                        </span>
                        <div className="text-[11px] text-slate-400 line-clamp-2">
                          {o.adminNote}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-2">
                        {o.slipUrl && (
                          <a
                            href={o.slipUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                          >
                            ดูสลิป ↗
                          </a>
                        )}
                        <Link
                          href="/admin/orders"
                          className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold transition-colors"
                        >
                          ไปหน้าปลดล็อก →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Hot Leads */}
        {bottomTab === 'leads' && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-96 overflow-y-auto">
            {data.hotLeads.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                ยังไม่มีรายชื่อ Hot Leads ในขณะนี้
              </p>
            ) : (
              <table className="w-full text-left text-xs md:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">ระดับความร้อนแรง</th>
                    <th className="px-3 py-2.5">ชื่อ / อีเมลสมาชิก</th>
                    <th className="px-3 py-2.5">สินค้าที่ให้ความสนใจ</th>
                    <th className="px-3 py-2.5">ใช้งานล่าสุด</th>
                    <th className="px-4 py-2.5 text-right">คัดลอกอีเมล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {data.hotLeads.map((ld) => (
                    <tr key={`${ld.leadType}_${ld.email}`} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ld.leadType === 'rejected_slip_unpaid'
                              ? 'bg-rose-500/20 text-rose-300'
                              : ld.leadType === 'trial_not_bought'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-cyan-500/15 text-cyan-300'
                          }`}
                        >
                          {ld.leadType === 'rejected_slip_unpaid'
                            ? '🚨 แนบสลิปไม่ผ่าน (ยังไม่ซื้อสำเร็จ)'
                            : ld.leadType === 'trial_not_bought'
                              ? '🔥 เคยขอทดลองใช้ฟรี (ยังไม่ซื้อ)'
                              : '👀 เพิ่งล็อกอินเข้าเว็บ (ยังไม่ซื้อ)'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-white">{ld.displayName}</div>
                        <div className="text-xs text-slate-400">{ld.email}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-200">
                        {ld.interestedToolName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                        {formatThaiDateTimeShort(ld.lastActiveIso)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(ld.email)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-300 font-medium"
                        >
                          {copiedEmail === ld.email ? '✓ คัดลอกแล้ว' : 'คัดลอกอีเมล'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: VIP Customers */}
        {bottomTab === 'vip' && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-96 overflow-y-auto">
            {vipCustomers.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">ยังไม่มีข้อมูลลูกค้า</p>
            ) : (
              <table className="w-full text-left text-xs md:text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">อันดับ</th>
                    <th className="px-3 py-2.5">ชื่อ / อีเมลลูกค้า</th>
                    <th className="px-3 py-2.5 text-right">จำนวนบิล</th>
                    <th className="px-3 py-2.5">เข้าใช้งานล่าสุด</th>
                    <th className="px-4 py-2.5 text-right">ยอดซื้อสะสมรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {vipCustomers.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-semibold text-amber-300">
                        #{idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-white">{c.displayName}</div>
                        <div className="text-xs text-slate-400">{c.email}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-white">
                        {c.ordersCount} บิล
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                        {formatThaiDateTimeShort(c.lastLoginIso || c.createdAtIso)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-400">
                        {c.totalSpent.toLocaleString()} ฿
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
