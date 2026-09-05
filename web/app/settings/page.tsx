"use client";

import { useEffect, useState } from "react";
import { CITIES } from "@/lib/api";
import {
  clearPreferences,
  DEFAULT_PREFERENCES,
  formatLocationStatus,
  readPreferences,
  updatePreferences,
  type AppPreferences,
} from "@/lib/preferences";

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [status, setStatus] = useState("Location access is off");

  useEffect(() => {
    const stored = readPreferences();
    setPreferences(stored);
    setStatus(formatLocationStatus(stored));

    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        const permission = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "unknown";
        const next = updatePreferences({ locationPermission: permission });
        setPreferences(next);
        setStatus(formatLocationStatus(next));
      });
    }
  }, []);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = updatePreferences({
          locationPermission: "granted",
          savedCoords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            updatedAt: new Date().toISOString(),
          },
        });
        setPreferences(next);
        setStatus(formatLocationStatus(next));
      },
      () => {
        const next = updatePreferences({ locationPermission: "denied", savedCoords: undefined });
        setPreferences(next);
        setStatus(formatLocationStatus(next));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const savePreferredCity = (cityId: string) => {
    const next = updatePreferences({ preferredCityId: cityId });
    setPreferences(next);
    setStatus(formatLocationStatus(next));
  };

  const clearLocalData = () => {
    clearPreferences();
    setPreferences(DEFAULT_PREFERENCES);
    setStatus("Saved location preferences cleared.");
  };

  return (
    <main style={{ maxWidth: 740, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>Settings</h1>
      <div style={{ background: "#f5f7fb", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{status}</p>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: "0.4rem" }}>
          <span style={{ fontWeight: 600 }}>Preferred city</span>
          <select
            value={preferences.preferredCityId}
            onChange={(event) => savePreferredCity(event.target.value)}
            style={{ padding: "0.9rem 1rem", borderRadius: 12, border: "1px solid #dfe7f3", background: "#fff" }}
          >
            {CITIES.map((city) => (
              <option key={city.id} value={city.id}>{city.label}</option>
            ))}
          </select>
        </label>

        <button
          onClick={requestLocation}
          style={{ padding: "0.9rem 1rem", borderRadius: 12, border: "none", background: "#1d4ed8", color: "#fff", cursor: "pointer" }}
        >
          {preferences.locationPermission === "granted" ? "Refresh location permission" : "Enable location access"}
        </button>

        <button
          onClick={clearLocalData}
          style={{ padding: "0.9rem 1rem", borderRadius: 12, border: "1px solid #dfe7f3", background: "#fff", cursor: "pointer" }}
        >
          Clear saved location data
        </button>
      </div>

      <div style={{ marginTop: "1.5rem", color: "#5b6475", lineHeight: 1.6 }}>
        <p style={{ marginBottom: "0.5rem" }}>Device location is optional. If you do not grant access, Rangroots uses your preferred city for editorial calendar defaults.</p>
        <p style={{ margin: 0 }}>Saved coordinates remain in local browser storage only and can be removed here at any time.</p>
      </div>
    </main>
  );
}
