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
  
  const icons: Metadata['icons'] = {
    icon: settings?.favicon_url || '/images/icon128.png'
  }

  const title = settings?.site_name 
    ? `${settings.site_name} | ${settings.tagline || 'คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม'}`
    : "PUP PAP AI | คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม"
  const description = settings?.description || "PUP PAP AI — คิดปุ๊บ คลิปปั๊บ สร้างและโพสต์วิดีโอ AI อัตโนมัติ Shopee, TikTok, Reels"

  return {
    title,
    description,
    icons,
    openGraph: {
      title,
      description,
      type: "website",
      images: [settings?.og_image_url || '/images/cover-puppap-ai.png'],
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('puppap_theme');
                  var theme = saved || 'cream';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
