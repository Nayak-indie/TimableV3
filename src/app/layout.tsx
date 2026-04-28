import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import AppShell from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Timable",
  description: "School timetable manager",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <AppShell>
          <div className="min-h-screen max-w-md mx-auto relative">
            <main className="pb-20 min-h-screen">{children}</main>
            <BottomNav />
            <OnboardingGate />
          </div>
        </AppShell>
      </body>
    </html>
  );
}
