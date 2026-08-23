import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pheem AI Toolkit - Multi-Provider Studio",
  description: "ศูนย์รวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอระดับมืออาชีพ",
  openGraph: {
    title: "Pheem AI Toolkit - Multi-Provider Studio",
    description: "ศูนย์รวมเครื่องมือ AI สำหรับสร้างคอนเทนต์วิดีโอระดับมืออาชีพ",
    type: "website",
  },
};

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
