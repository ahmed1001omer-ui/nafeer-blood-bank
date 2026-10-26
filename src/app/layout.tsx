import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { SessionProvider } from "@/lib/session-context";
import { LanguageProvider } from "@/lib/i18n-context";
import AppShell from "@/components/AppShell";
import ThemeScript from "@/components/ThemeScript";
import ErrorOverlay from "@/components/ErrorOverlay";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { SYSTEM_NAME, HOSPITAL_NAME } from "@/lib/constants";
import { getBloodBankSettings } from "@/lib/blood-bank-settings";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const bank = await getBloodBankSettings();
  const hospitalDisplay = bank.hospitalName || HOSPITAL_NAME;
  return {
    title: `${SYSTEM_NAME} — ${hospitalDisplay}`,
    description: "نظام إدارة داخلي متكامل لبنك الدم والمستشفى",
    manifest: "/manifest.json",
    applicationName: SYSTEM_NAME,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: SYSTEM_NAME,
    },
    icons: {
      icon: [
        { url: "/icon.png?v=2", type: "image/png" },
        { url: "/favicon.ico?v=2" },
      ],
      apple: "/icon.png?v=2",
      shortcut: "/icon.png?v=2",
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [user, bank] = await Promise.all([
    getSession(),
    getBloodBankSettings(),
  ]);

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#DC2626" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load Google Fonts asynchronously with local fallback to prevent render blocking in offline desktop mode */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
          media="print"
          // @ts-expect-error non-blocking font loading for offline speed
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap"
            rel="stylesheet"
          />
        </noscript>
      </head>
      <body className="antialiased">
        <ServiceWorkerRegister />
        <LanguageProvider>
          <SessionProvider user={user}>
            {user ? <AppShell bank={bank}>{children}</AppShell> : children}
          </SessionProvider>
          <ErrorOverlay />
        </LanguageProvider>
      </body>
    </html>
  );
}
