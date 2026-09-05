// Shared API client for the Calendar & Events services.
// Mirrors the endpoints defined in rangroots.api.
// Calendar and Events are now surfaced together on a single /calendar page,
// so this client exposes both panchang/festival data and city events.

const CALENDAR_API_BASE = process.env.NEXT_PUBLIC_CALENDAR_API_BASE ?? "http://localhost:8000";
const EVENTS_API_BASE = process.env.NEXT_PUBLIC_EVENTS_API_BASE ?? "http://localhost:8001";

export interface DailyPanchang {
  date: string;
  city_id: string;
  location_context?: LocationContext;
  tithi: string;
  paksha: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise: string;
  sunset: string;
  festivals: string[];
  muhurtas: Record<string, unknown>;
}

export interface FestivalEntry {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD, city-local
  end_date?: string;
  category: "festival" | "deity" | "observance" | "other";
  description?: string;
  type?: string;
  rule_hint?: string;
  year?: number;
}

export interface CalendarHighlight {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  category: "festival" | "deity" | "observance" | "other";
}

export interface LocationContext {
  requested_latitude?: number;
  requested_longitude?: number;
  resolved_city_id: string;
  resolved_city_name: string;
  timezone: string;
  distance_km: number;
}

export interface MonthlyPanchangResponse {
  month: string;
  city_id: string;
  location_context?: LocationContext;
  days: DailyPanchang[];
}

export interface HomepageContentResponse {
  monthData: MonthlyPanchangResponse | null;
  festivals: FestivalEntry[];
  highlights: CalendarHighlight[];
  events: EventSummary[];
  resolvedCityId?: string;
  resolvedCityName?: string;
  timezone?: string;
  errors: string[];
}

export interface HomepageContentRequest {
  month?: string;
  year?: number;
  cityId?: string;
  lat?: number;
  lng?: number;
}

interface FestivalsApiResponse {
  year: number;
  city_id: string;
  festivals: FestivalEntry[];
}

interface CalendarHighlightsApiResponse {
  month: string;
  city_id: string;
  highlights: CalendarHighlight[];
}

interface MonthlyPanchangApiResponse extends MonthlyPanchangResponse {}

interface LocationContextApiResponse extends LocationContext {}

export interface EventSummary {
  id: string;
  city_id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime?: string;
  venue_name?: string;
  event_category: string;
  is_free: boolean;
}

export const CITIES = [
  { id: "berlin", label: "Berlin" },
  { id: "munich", label: "Munich" },
  { id: "hamburg", label: "Hamburg" },
  { id: "frankfurt", label: "Frankfurt" },
];

export async function getDailyPanchang(date: string, cityId: string): Promise<DailyPanchang> {
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/daily?date=${date}&city_id=${cityId}`);
  if (!res.ok) throw new Error("Failed to fetch daily panchang");
  return res.json();
}

export async function getDailyPanchangByLocation(date: string, lat: number, lng: number): Promise<DailyPanchang> {
  const params = new URLSearchParams({ date, lat: String(lat), lng: String(lng) });
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/daily?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch local panchang");
  return res.json();
}

export async function getFestivals(year: number, cityId: string): Promise<FestivalEntry[]> {
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/festivals?year=${year}&city_id=${cityId}`);
  if (!res.ok) throw new Error("Failed to fetch festivals");
  const payload = (await res.json()) as FestivalsApiResponse;
  return payload.festivals;
}

export async function getCalendarHighlights(month: string, cityId: string): Promise<CalendarHighlight[]> {
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/highlights?month=${month}&city_id=${cityId}`);
  if (!res.ok) throw new Error("Failed to fetch calendar highlights");
  const payload = (await res.json()) as CalendarHighlightsApiResponse;
  return payload.highlights;
}

export async function getMonthlyPanchang(month: string, cityId: string): Promise<MonthlyPanchangResponse> {
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/monthly?month=${month}&city_id=${cityId}`);
  if (!res.ok) throw new Error("Failed to fetch monthly panchang");
  return (await res.json()) as MonthlyPanchangApiResponse;
}

export async function getMonthlyPanchangByLocation(month: string, lat: number, lng: number, cityId?: string): Promise<MonthlyPanchangResponse> {
  const params = new URLSearchParams({ month, lat: String(lat), lng: String(lng) });
  if (cityId) {
    params.set("city_id", cityId);
  }
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/monthly?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch location-aware monthly panchang");
  return (await res.json()) as MonthlyPanchangApiResponse;
}

export async function resolveLocationContext(lat: number, lng: number): Promise<LocationContext> {
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/location-context?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("Failed to resolve location context");
  return (await res.json()) as LocationContextApiResponse;
}

export async function getHomepageContent(params?: HomepageContentRequest): Promise<HomepageContentResponse> {
  const res = await fetch("/api/homepage-content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params ?? {}),
  });
  if (!res.ok) throw new Error("Failed to fetch homepage content");
  return res.json();
}

export async function listEvents(params: {
  cityId?: string;
  from?: string;
  to?: string;
  category?: string;
  isFree?: boolean;
  q?: string;
}): Promise<EventSummary[]> {
  const search = new URLSearchParams();
  if (params.cityId) search.set("city_id", params.cityId);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.category) search.set("category", params.category);
  if (params.isFree !== undefined) search.set("is_free", String(params.isFree));
  if (params.q) search.set("q", params.q);

  const res = await fetch(`${EVENTS_API_BASE}/api/events?${search.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}
