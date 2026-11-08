'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  FB_PIXEL_ID,
  captureUtmContent,
  fbPageView,
  hasMarketingConsent,
  sendFirstPartyTrackBeacon,
} from '@/lib/meta-pixel';
import PdpaConsentBanner from '@/components/PdpaConsentBanner';

function MetaPixelRouteTracker({ hasConsent }: { hasConsent: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmContent = captureUtmContent();
    if (hasConsent) {
      fbPageView();
    }

    // Guard against tracking in development or on /admin routes
    if (
      process.env.NODE_ENV === 'development' ||
      !pathname ||
      pathname.startsWith('/admin')
    ) {
      return;
    }

    sendFirstPartyTrackBeacon(pathname, utmContent);
  }, [pathname, searchParams, hasConsent]);

  return null;
}

export default function MetaPixel() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setHasConsent(hasMarketingConsent());
    };
    syncConsent();
    window.addEventListener('puppap-consent-updated', syncConsent);
    window.addEventListener('storage', syncConsent);
    return () => {
      window.removeEventListener('puppap-consent-updated', syncConsent);
      window.removeEventListener('storage', syncConsent);
    };
  }, []);

  const shouldLoadMarketingPixel = Boolean(FB_PIXEL_ID && hasConsent);

  return (
    <>
      {shouldLoadMarketingPixel && (
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
        </>
      )}
      <Suspense fallback={null}>
        <MetaPixelRouteTracker hasConsent={hasConsent} />
      </Suspense>
      <PdpaConsentBanner />
    </>
  );
}
