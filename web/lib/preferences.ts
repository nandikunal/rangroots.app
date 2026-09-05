export type LocationPermissionState = "unknown" | "granted" | "denied";

export interface AppPreferences {
  locationPermission: LocationPermissionState;
  preferredCityId: string;
  savedCoords?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  locationPermission: "unknown",
  preferredCityId: "berlin",
};

const STORAGE_KEY = "rangroots.app.preferences";

export function readPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(next: AppPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function updatePreferences(partial: Partial<AppPreferences>): AppPreferences {
  const next = {
    ...readPreferences(),
    ...partial,
  };
  writePreferences(next);
  return next;
}

export function clearPreferences(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function formatLocationStatus(preferences: AppPreferences): string {
  if (preferences.savedCoords) {
    return `Location enabled: ${preferences.savedCoords.latitude.toFixed(4)}, ${preferences.savedCoords.longitude.toFixed(4)}`;
  }

  if (preferences.locationPermission === "granted") {
    return `Location access enabled. Preferred city: ${preferences.preferredCityId}.`;
  }

  if (preferences.locationPermission === "denied") {
    return "Location access is denied. You can re-enable it from browser settings.";
  }

  return "Location access is off. Enable it to personalize your local calendar.";
}