import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import RegisterServiceWorker from "./RegisterServiceWorker";
import OfflineBanner from "./_components/OfflineBanner";
import BottomNav from "./_components/BottomNav";

export const metadata: Metadata = {
  title: {
    default: "HomeCheck — Gestion & Maintenance Locative",
    template: "%s | HomeCheck",
  },
  description: "Plateforme PWA de gestion du cycle de vie locatif, maintenance et budget HomeCheck.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HomeCheck",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
};

const themeScript = `
  (function() {
    try {
      var storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col pb-16 md:pb-0" suppressHydrationWarning>
        <RegisterServiceWorker />
        <OfflineBanner />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
