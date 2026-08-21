import Link from "next/link";

// Home page: two primary actions + city selector + today's highlights.
// Server-rendered for SEO — festival/event highlights should be crawlable.
export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Rang Roots</h1>
      <p>City: Berlin</p>

      <nav style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
        <Link href="/calendar">Hindu calendar & muhurta</Link>
        <Link href="/events">Indian events in your city</Link>
      </nav>
    </main>
  );
}
