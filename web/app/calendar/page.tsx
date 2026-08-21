// Daily panchang summary page.
// Shows key elements by default; advanced panchang info behind a toggle
// (implement as a client component once the "More details" interaction is wired up).
export default async function CalendarPage() {
  // TODO: fetch via getDailyPanchang(date, cityId) from lib/api.ts (server component data fetch)
  return (
    <main style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Calendar & Muhurta</h1>
      <p>Tithi: —</p>
      <p>Paksha: —</p>
      <p>Sunrise / Sunset: — / —</p>
      <p>Today&apos;s festival: —</p>
    </main>
  );
}
