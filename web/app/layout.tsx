import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

// Fraunces gives display text a crafted editorial feel while Manrope
// keeps dense date/event content legible across cards and tables.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Rangroots.app — Panchang & Community Calendar",
  description: "Celebrating Heritage & Culture through the Panchang, festival observances, and community calendar.",
  manifest: "/manifest.webmanifest",
  applicationName: "Rang Roots",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rang Roots",
  },
};

export const viewport = {
  themeColor: "#1f2937",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="zen-sans">{children}</body>
    </html>
  );
}
