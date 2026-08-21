import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rang Roots — Hindu Calendar & Indian Events in Europe",
  description:
    "Hindu calendar, muhurta timings, and Indian community events for cities across Europe, starting with Germany.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
