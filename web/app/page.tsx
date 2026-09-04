import Link from "next/link";

// Home page: single primary action now that Calendar and Events are merged.
// Server-rendered for SEO.
export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Rang Roots</h1>
      <p>Hindu calendar, panchang & Indian community events \u2014 by city.</p>

      <nav style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
        <Link href="/calendar">Calendar & Events \u2192</Link>
      </nav>
    </main>
  );
}
