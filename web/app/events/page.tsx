// City-wise events listing page.
// City picker, date filter, category chips, free/paid toggle, event card list.
// Server component for SEO — event listings should be crawlable and shareable.
export default async function EventsPage() {
  // TODO: fetch via listEvents({...}) from lib/api.ts (server component data fetch)
  return (
    <main style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1>Indian Events</h1>
      <p>Event list — TODO</p>
    </main>
  );
}
