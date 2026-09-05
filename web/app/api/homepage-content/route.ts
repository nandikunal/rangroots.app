import { NextResponse } from "next/server";

import type { CalendarHighlight, EventSummary, FestivalEntry } from "@/lib/api";

const CALENDAR_API_BASE = process.env.CALENDAR_API_BASE ?? process.env.NEXT_PUBLIC_CALENDAR_API_BASE ?? "http://localhost:8000";
const EVENTS_API_BASE = process.env.EVENTS_API_BASE ?? process.env.NEXT_PUBLIC_EVENTS_API_BASE ?? "http://localhost:8001";

const LANDING_CITY_ID = "berlin";
const LANDING_MONTH = "2026-09";
const LANDING_YEAR = 2026;

type HomepageContentResponse = {
  festivals: FestivalEntry[];
  highlights: CalendarHighlight[];
  events: EventSummary[];
  errors: string[];
};

type FestivalsApiResponse = {
  festivals: FestivalEntry[];
};

type CalendarHighlightsApiResponse = {
  highlights: CalendarHighlight[];
};

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
  const month = LANDING_MONTH;
  const year = LANDING_YEAR;
  const cityId = LANDING_CITY_ID;
  const errors: string[] = [];

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
  const calendarQuery = buildCalendarQuery(params);
  const eventsQuery = new URLSearchParams({ from: `${params.month}-01` });
  if (params.cityId) {
    eventsQuery.set("city_id", params.cityId);
  }

  const [festivalsResult, highlightsResult, eventsResult] = await Promise.allSettled([
    fetchJson<FestivalsApiResponse>(`${CALENDAR_API_BASE}/api/calendar/festivals?year=${params.year}&${calendarQuery}`),
    fetchJson<CalendarHighlightsApiResponse>(`${CALENDAR_API_BASE}/api/calendar/highlights?month=${params.month}&${calendarQuery}`),
    fetchJson<EventSummary[]>(`${EVENTS_API_BASE}/api/events?${eventsQuery.toString()}`),
  ]);

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
    festivals: festivalsResult.status === "fulfilled" ? festivalsResult.value.festivals : [],
    highlights: highlightsResult.status === "fulfilled" ? highlightsResult.value.highlights : [],
    events: eventsResult.status === "fulfilled" ? eventsResult.value : [],
    errors,
  };

  const status = payload.festivals.length || payload.highlights.length || payload.events.length ? 200 : 502;
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
    month: body.month ?? LANDING_MONTH,
    year: body.year ?? LANDING_YEAR,
    cityId: body.cityId,
    lat: body.lat,
    lng: body.lng,
  });
}