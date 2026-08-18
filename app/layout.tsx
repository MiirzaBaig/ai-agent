import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { EventStoreProvider } from "@/lib/events/store";
import { SessionStoreProvider } from "@/lib/sessions/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sentry — Autonomous Computer-Use Agent",
  description:
    "Delegate a task and watch an autonomous agent carry it out on a live desktop — with a full evidence trail of every step and approval gates on destructive actions.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionStoreProvider>
          <EventStoreProvider>
            {children}
          </EventStoreProvider>
        </SessionStoreProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
