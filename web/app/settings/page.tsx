"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [status, setStatus] = useState("Location access is off");

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        setLocationEnabled(result.state === "granted");
        setStatus(result.state === "granted" ? "Location access is enabled" : "Location access is off");
      });
    }
  }, []);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationEnabled(true);
        setStatus("Location access granted.");
      },
      () => {
        setStatus("Location access denied. You can re-enable it from browser settings.");
        setLocationEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const clearLocalData = () => {
    localStorage.clear();
    setStatus("Cached data cleared.");
    setLocationEnabled(false);
  };

  return (
    <main style={{ maxWidth: 740, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>Settings</h1>
      <div style={{ background: "#f5f7fb", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{status}</p>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <button
          onClick={requestLocation}
          style={{ padding: "0.9rem 1rem", borderRadius: 12, border: "none", background: "#1d4ed8", color: "#fff", cursor: "pointer" }}
        >
          {locationEnabled ? "Refresh location permission" : "Enable location access"}
        </button>

        <button
          onClick={clearLocalData}
          style={{ padding: "0.9rem 1rem", borderRadius: 12, border: "1px solid #dfe7f3", background: "#fff", cursor: "pointer" }}
        >
          Clear cached location data
        </button>
      </div>
    </main>
  );
}
