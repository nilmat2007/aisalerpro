'use client';

import React, { Suspense, useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { FB_PIXEL_ID, captureUtmContent, fbPageView } from '@/lib/meta-pixel';

function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmContent = captureUtmContent();
    fbPageView();

    // Guard against tracking in development or on /admin routes
    if (
      process.env.NODE_ENV === 'development' ||
      !pathname ||
      pathname.startsWith('/admin')
    ) {
      return;
    }

    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname, utmContent }),
      keepalive: true,
    }).catch(() => {
      // Non-blocking visitor analytics
    });
  }, [pathname, searchParams]);

  return null;
}

export default function MetaPixel() {
  if (!FB_PIXEL_ID) {
    return (
      <Suspense fallback={null}>
        <MetaPixelRouteTracker />
      </Suspense>
    );
  }

  return (
    <>
      <Script
        id="fb-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(FB_PIXEL_ID)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <MetaPixelRouteTracker />
      </Suspense>
    </>
  );
}
