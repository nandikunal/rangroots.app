import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

// Serif for the meditative "today" focal point and section headers;
// Inter for body copy — a calmer, less clinical pairing than a default
// system sans everywhere.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Rang Roots — Panchang & Community Calendar",
  description: "A calm, modern space for the Hindu calendar, muhurta, and Indian community events in your city.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="zen-sans">{children}</body>
    </html>
  );
}
