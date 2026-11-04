'use client';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';

/**
 * Capture `utm_content` (e.g., hook_A, hook_B, hook_C) into both sessionStorage
 * and a first-party cookie so both client-side Pixel and server-side CAPI
 * can attribute purchases to the exact video hook.
 */
export function captureUtmContent(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_content')?.trim() || '';
    if (utm) {
      sessionStorage.setItem('utm_content', utm);
      document.cookie = `utm_content=${encodeURIComponent(utm)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }

    // Ensure _fbc cookie is populated when arriving with ?fbclid=...
    const fbclid = params.get('fbclid')?.trim();
    if (fbclid && !document.cookie.includes('_fbc=')) {
      const fbcValue = `fb.1.${Date.now()}.${fbclid}`;
      document.cookie = `_fbc=${encodeURIComponent(fbcValue)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
    }

    return utm || sessionStorage.getItem('utm_content') || '';
  } catch {
    return '';
  }
}

export function fbPageView(): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
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
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  const utmContent = captureUtmContent();
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
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  const utmContent = captureUtmContent() || 'unknown';
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
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;

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
