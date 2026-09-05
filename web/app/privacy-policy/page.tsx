export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.25rem 4rem", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: "2.25rem", marginBottom: "1rem" }}>Privacy Policy</h1>
      <p>
        Rang Roots asks for precise location access only when you choose to enable it. We use your
        latitude and longitude to calculate local sunrise, sunset, Tithi, Nakshatra, Rahu Kaal, and nearby
        community events. This processing happens in the browser or on a trusted server only when you
        explicitly grant permission.
      </p>
      <p>
        We do not sell personal location data. We do not store exact coordinates unless you choose to save a
        preferred city or location profile in the app. We keep cached data minimal and ephemeral, and you can
        revoke permission or clear saved local data in the settings panel at any time.
      </p>
      <p>
        For the MVP experience, location consent state, preferred city, and optional saved coordinates are kept in
        your browser storage so the homepage and settings page can stay in sync without requiring an account.
      </p>
      <h2>Location data handling</h2>
      <ul>
        <li>Browser location is requested only after explicit user consent.</li>
        <li>Coordinates are used client-side for immediate Panchang calculation, or sent only to the app backend for local date/time calculations.</li>
        <li>Location data is not used for tracking, ad targeting, or third-party analytics.</li>
        <li>Preferred city and local consent state are stored only in this browser until you clear them.</li>
      </ul>
      <h2>Settings and controls</h2>
      <p>
        You can revoke geolocation permissions from your browser or from the Rang Roots app settings page.
        Clearing browser storage removes cached location preferences and local app state.
      </p>
    </main>
  );
}
