import type { Metadata } from "next";
import "./globals.css";
import { createClient } from '@supabase/supabase-js'

async function getSettings() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    const { data } = await supabase.from('site_settings').select('*').limit(1).maybeSingle()
    return data
  } catch {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  
  const icons: Metadata['icons'] = {}
  if (settings?.favicon_url) {
    icons.icon = settings.favicon_url
  }

  return {
    title: settings?.site_name || "Pheem AI Toolkit - Multi-Provider Studio",
    description: settings?.description || "ศูนย์รวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอระดับมืออาชีพ",
    icons,
    openGraph: {
      title: settings?.site_name || "Pheem AI Toolkit - Multi-Provider Studio",
      description: settings?.description || "ศูนย์รวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอระดับมืออาชีพ",
      type: "website",
      ...(settings?.og_image_url && { images: [settings.og_image_url] }),
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
