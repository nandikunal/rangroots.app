// Shared API client for the Calendar & Events services.
// Mirrors the endpoints defined in rangroots.api.

const CALENDAR_API_BASE = process.env.NEXT_PUBLIC_CALENDAR_API_BASE ?? "http://localhost:8000";
const EVENTS_API_BASE = process.env.NEXT_PUBLIC_EVENTS_API_BASE ?? "http://localhost:8001";

export interface DailyPanchang {
  date: string;
  city_id: string;
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

export async function getDailyPanchang(date: string, cityId: string): Promise<DailyPanchang> {
  const res = await fetch(`${CALENDAR_API_BASE}/api/calendar/daily?date=${date}&city_id=${cityId}`);
  if (!res.ok) throw new Error("Failed to fetch daily panchang");
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
