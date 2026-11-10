'use client';

import dynamic from 'next/dynamic';

const FloatingPromoWidget = dynamic(
  () => import('@/components/FloatingPromoWidget'),
  { ssr: false }
);

export default function FloatingPromoWidgetLoader() {
  return <FloatingPromoWidget />;
}
