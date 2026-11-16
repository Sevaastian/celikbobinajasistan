import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ACCENT_COOKIE, ACCENTS } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Çelik Bobinaj – Atölye Yönetim Sistemi",
  description: "Bobinaj ve teknik servis işletmesi için atölye yönetim sistemi",
  applicationName: "Çelik Bobinaj",
  manifest: "/manifest.webmanifest",
  // iPhone'da "Ana Ekrana Ekle" ile tam ekran uygulama gibi açılır
  appleWebApp: { capable: true, title: "Çelik Bobinaj", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // çentik ve ana ekran çubuğu alanlarını güvenli alan ile yönetiriz
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = cookies().get(ACCENT_COOKIE)?.value;
  const accent = ACCENTS.some((a) => a.id === saved) ? saved : "mavi";
  return (
    <html lang="tr" data-accent={accent}>
      <body>{children}</body>
    </html>
  );
}
