import { NextResponse } from "next/server";

import type { CalendarHighlight, EventSummary, FestivalEntry, LocationContext, MonthlyPanchangResponse } from "@/lib/api";

const CALENDAR_API_BASE = process.env.CALENDAR_API_BASE ?? process.env.NEXT_PUBLIC_CALENDAR_API_BASE ?? "http://localhost:8000";
const EVENTS_API_BASE = process.env.EVENTS_API_BASE ?? process.env.NEXT_PUBLIC_EVENTS_API_BASE ?? "http://localhost:8001";

const LANDING_CITY_ID = "berlin";

type HomepageContentResponse = {
  monthData: MonthlyPanchangResponse | null;
  festivals: FestivalEntry[];
  highlights: CalendarHighlight[];
  events: EventSummary[];
  resolvedCityId?: string;
  resolvedCityName?: string;
  timezone?: string;
  errors: string[];
};

type FestivalsApiResponse = {
  festivals: FestivalEntry[];
};

type CalendarHighlightsApiResponse = {
  highlights: CalendarHighlight[];
};

type MonthlyPanchangApiResponse = MonthlyPanchangResponse;

type LocationContextApiResponse = LocationContext;

function getCurrentMonthContext() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return { month, year };
}

function getMonthEnd(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return `${year}-${String(monthIndex).padStart(2, "0")}-${String(new Date(Date.UTC(year, monthIndex, 0)).getUTCDate()).padStart(2, "0")}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function GET() {
  const { month, year } = getCurrentMonthContext();
  const cityId = LANDING_CITY_ID;

  return buildHomepageContent({ month, year, cityId });
}

type HomepageContentRequest = {
  month: string;
  year: number;
  cityId?: string;
  lat?: number;
  lng?: number;
};

function buildCalendarQuery(params: HomepageContentRequest): string {
  const search = new URLSearchParams();
  if (params.cityId) {
    search.set("city_id", params.cityId);
  }
  if (params.lat !== undefined && params.lng !== undefined) {
    search.set("lat", String(params.lat));
    search.set("lng", String(params.lng));
  }
  return search.toString();
}

async function buildHomepageContent(params: HomepageContentRequest) {
  const errors: string[] = [];
  let locationContext: LocationContextApiResponse | null = null;

  if (params.lat !== undefined && params.lng !== undefined) {
    try {
      locationContext = await fetchJson<LocationContextApiResponse>(
        `${CALENDAR_API_BASE}/api/calendar/location-context?lat=${params.lat}&lng=${params.lng}`
      );
    } catch (error) {
      errors.push(`location: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  const effectiveCityId = locationContext?.resolved_city_id ?? params.cityId ?? LANDING_CITY_ID;
  const calendarQuery = buildCalendarQuery({ ...params, cityId: effectiveCityId });
  const eventsQuery = new URLSearchParams({ from: `${params.month}-01`, to: getMonthEnd(params.month), city_id: effectiveCityId });

  const [monthlyResult, festivalsResult, highlightsResult, eventsResult] = await Promise.allSettled([
    fetchJson<MonthlyPanchangApiResponse>(`${CALENDAR_API_BASE}/api/calendar/monthly?month=${params.month}&${calendarQuery}`),
    fetchJson<FestivalsApiResponse>(`${CALENDAR_API_BASE}/api/calendar/festivals?year=${params.year}&${calendarQuery}`),
    fetchJson<CalendarHighlightsApiResponse>(`${CALENDAR_API_BASE}/api/calendar/highlights?month=${params.month}&${calendarQuery}`),
    fetchJson<EventSummary[]>(`${EVENTS_API_BASE}/api/events?${eventsQuery.toString()}`),
  ]);

  if (monthlyResult.status === "rejected") {
    errors.push(`monthly: ${monthlyResult.reason instanceof Error ? monthlyResult.reason.message : "request failed"}`);
  }

  if (festivalsResult.status === "rejected") {
    errors.push(`festivals: ${festivalsResult.reason instanceof Error ? festivalsResult.reason.message : "request failed"}`);
  }

  if (highlightsResult.status === "rejected") {
    errors.push(`highlights: ${highlightsResult.reason instanceof Error ? highlightsResult.reason.message : "request failed"}`);
  }

  if (eventsResult.status === "rejected") {
    errors.push(`events: ${eventsResult.reason instanceof Error ? eventsResult.reason.message : "request failed"}`);
  }

  const payload: HomepageContentResponse = {
    monthData: monthlyResult.status === "fulfilled" ? monthlyResult.value : null,
    festivals: festivalsResult.status === "fulfilled" ? festivalsResult.value.festivals : [],
    highlights: highlightsResult.status === "fulfilled" ? highlightsResult.value.highlights : [],
    events: eventsResult.status === "fulfilled" ? eventsResult.value : [],
    resolvedCityId:
      locationContext?.resolved_city_id ??
      (monthlyResult.status === "fulfilled" ? monthlyResult.value.location_context?.resolved_city_id ?? monthlyResult.value.city_id : effectiveCityId),
    resolvedCityName:
      locationContext?.resolved_city_name ??
      (monthlyResult.status === "fulfilled" ? monthlyResult.value.location_context?.resolved_city_name : undefined),
    timezone:
      locationContext?.timezone ??
      (monthlyResult.status === "fulfilled" ? monthlyResult.value.location_context?.timezone : undefined),
    errors,
  };

  const status = payload.monthData || payload.festivals.length || payload.highlights.length || payload.events.length ? 200 : 502;
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    month?: string;
    year?: number;
    cityId?: string;
    lat?: number;
    lng?: number;
  };

  return buildHomepageContent({
    month: body.month ?? getCurrentMonthContext().month,
    year: body.year ?? getCurrentMonthContext().year,
    cityId: body.cityId,
    lat: body.lat,
    lng: body.lng,
  });
}