'use client';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    gtag?: (...args: any[]) => void;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';
export const PDPA_CONSENT_KEY = 'puppap_pdpa_consent';
export const PREVIEW_AB_STORAGE_KEY = 'puppap_preview_ab';

export type PreviewEventName =
  | 'preview_play'
  | 'preview_unmute'
  | 'preview_25'
  | 'preview_50'
  | 'preview_75'
  | 'preview_100'
  | 'sticky_30s_cta_click'
  | 'overlay_cta_click'
  | 'curriculum_click_from_preview'
  | 'purchase_from_preview';

/**
 * PDPA Marketing Consent Gate:
 * Returns true ONLY when the user has explicitly accepted marketing/analytics cookies.
 */
export function hasMarketingConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PDPA_CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function getConsentStatus(): 'accepted' | 'declined' | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(PDPA_CONSENT_KEY);
    if (val === 'accepted' || val === 'declined') return val;
    return null;
  } catch {
    return null;
  }
}

export function setMarketingConsent(accepted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PDPA_CONSENT_KEY, accepted ? 'accepted' : 'declined');
    window.dispatchEvent(new Event('puppap-consent-updated'));
  } catch {
    // Ignore storage errors in private browsing
  }
}

/**
 * Persistent 50/50 A/B Variant assignment for Lesson 21 Preview Overlay CTA.
 * Excludes automated browsers/bots (`navigator.webdriver`) and persists across refreshes.
 */
export function getPreviewAbVariant(): 'A' | 'B' {
  if (typeof window === 'undefined' || navigator.webdriver) return 'A';
  try {
    const saved = localStorage.getItem(PREVIEW_AB_STORAGE_KEY);
    if (saved === 'A' || saved === 'B') return saved;
    const v: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(PREVIEW_AB_STORAGE_KEY, v);
    return v;
  } catch {
    return 'A';
  }
}

export function setUtmAttribution(utmValue: string): void {
  if (typeof window === 'undefined' || !utmValue) return;
  try {
    const clean = utmValue.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    if (!clean) return;
    sessionStorage.setItem('utm_content', clean);
    document.cookie = `utm_content=${encodeURIComponent(clean)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } catch {
    // Ignore storage errors
  }
}

/**
 * Capture `utm_content` (e.g., hook_A, preview_l21_overlay_A) into both sessionStorage
 * and a first-party cookie so both client-side Pixel and server-side CAPI
 * can attribute purchases to the exact video hook.
 */
export function captureUtmContent(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_content')?.trim() || '';
    if (utm) {
      setUtmAttribution(utm);
    }

    // Ensure _fbc cookie is populated when arriving with ?fbclid=... (only after PDPA consent)
    const fbclid = params.get('fbclid')?.trim();
    if (fbclid && hasMarketingConsent() && !document.cookie.includes('_fbc=')) {
      const fbcValue = `fb.1.${Date.now()}.${fbclid}`;
      document.cookie = `_fbc=${encodeURIComponent(fbcValue)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
    }

    return utm || sessionStorage.getItem('utm_content') || '';
  } catch {
    return '';
  }
}

/**
 * Non-blocking first-party beacon helper (`/api/track-visit`).
 * Uses `navigator.sendBeacon` first, falling back to `fetch(..., { keepalive: true })`.
 */
export function sendFirstPartyTrackBeacon(pathname: string, utmContent?: string): void {
  if (typeof window === 'undefined' || navigator.webdriver) return;
  if (process.env.NODE_ENV === 'development') return;

  const payload = JSON.stringify({
    pathname,
    utmContent: utmContent || '',
  });

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const queued = navigator.sendBeacon('/api/track-visit', blob);
      if (queued) return;
    }
  } catch {
    // Fallback to fetch keepalive below
  }

  fetch('/api/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Non-blocking visitor analytics
  });
}

/**
 * Track Lesson 21 Preview Video Funnel Events:
 * 1. Excludes bots (`navigator.webdriver`)
 * 2. Fires first-party anonymous event to Supabase (`/api/track-visit`) via `sendBeacon`
 * 3. Gates third-party Meta Pixel (`fbq`) & GA4 (`gtag`) strictly behind `hasMarketingConsent()`
 */
export function trackPreviewEvent(
  eventName: PreviewEventName,
  metadata: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || navigator.webdriver) return;

  const utmTag =
    typeof metadata.utm_content === 'string' && metadata.utm_content
      ? metadata.utm_content
      : typeof metadata.variant === 'string' && metadata.variant
        ? `variant_${metadata.variant}`
        : '';

  if (typeof metadata.utm_content === 'string' && metadata.utm_content) {
    setUtmAttribution(metadata.utm_content);
  }

  // 1. First-party anonymous counter (no PII, PDPA exempt)
  sendFirstPartyTrackBeacon(`/event/${eventName}`, utmTag);

  // 2. Third-party marketing/analytics pixels (strictly gated by PDPA consent)
  if (!hasMarketingConsent()) return;

  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', eventName, metadata);
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, metadata);
  }
}

export function fbPageView(): void {
  if (typeof window === 'undefined' || !hasMarketingConsent() || typeof window.fbq !== 'function') {
    return;
  }
  window.fbq('track', 'PageView');
}

export function fbViewContent({
  contentName = 'tiktok-ai-affiliate',
  contentId = 'tiktok-ai-affiliate',
  value = 299,
  currency = 'THB',
}: {
  contentName?: string;
  contentId?: string;
  value?: number;
  currency?: string;
} = {}): void {
  const utmContent = captureUtmContent();
  if (typeof window === 'undefined' || !hasMarketingConsent() || typeof window.fbq !== 'function') {
    return;
  }
  window.fbq('track', 'ViewContent', {
    content_name: utmContent ? `${contentName}_${utmContent}` : contentName,
    content_ids: [contentId],
    content_type: 'product',
    value,
    currency,
  });
}

export function fbInitiateCheckout({
  contentName = 'tiktok-ai-affiliate',
  contentId = 'tiktok-ai-affiliate',
  value = 299,
  currency = 'THB',
}: {
  contentName?: string;
  contentId?: string;
  value?: number;
  currency?: string;
} = {}): void {
  const utmContent = captureUtmContent() || 'unknown';
  if (utmContent.startsWith('preview_l21')) {
    sendFirstPartyTrackBeacon('/event/purchase_from_preview', utmContent);
  }
  if (typeof window === 'undefined' || !hasMarketingConsent() || typeof window.fbq !== 'function') {
    return;
  }
  window.fbq('track', 'InitiateCheckout', {
    content_name: `course_${utmContent}`,
    content_ids: [contentId],
    content_type: 'product',
    value,
    currency,
  });
}

export function fbPurchase({
  orderId,
  value = 299,
  contentId = 'tiktok-ai-affiliate',
  currency = 'THB',
}: {
  orderId: string;
  value: number;
  contentId?: string;
  currency?: string;
}): void {
  if (typeof window === 'undefined' || !hasMarketingConsent() || typeof window.fbq !== 'function') {
    return;
  }

  try {
    const dedupKey = `fb_purchased_${orderId}`;
    if (sessionStorage.getItem(dedupKey)) return;
    sessionStorage.setItem(dedupKey, '1');
  } catch {
    // Ignore storage errors in private browsing
  }

  const utmContent = captureUtmContent() || 'unknown';

  window.fbq(
    'track',
    'Purchase',
    {
      value,
      currency,
      content_name: `course_${utmContent}`,
      content_ids: [contentId],
      content_type: 'product',
    },
    { eventID: `order_${orderId}` }
  );
}

export function fbRefundRequest({
  orderId,
  value = 299,
  contentId = 'tiktok-ai-affiliate',
  currency = 'THB',
}: {
  orderId: string;
  value?: number;
  contentId?: string;
  currency?: string;
}): void {
  if (typeof window === 'undefined' || !hasMarketingConsent() || typeof window.fbq !== 'function') {
    return;
  }
  const utmContent = captureUtmContent() || 'unknown';
  window.fbq(
    'trackCustom',
    'RefundRequest',
    {
      value,
      currency,
      content_name: `course_${utmContent}`,
      content_ids: [contentId],
      content_type: 'product',
    },
    { eventID: `refund_${orderId}` }
  );
}
