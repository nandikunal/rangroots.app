"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import {
  getHomepageContent,
  type HomepageContentRequest,
  type CalendarHighlight,
  type DailyPanchang,
  type EventSummary,
  type FestivalEntry,
  type MonthlyPanchangResponse,
  CITIES,
} from "@/lib/api";
import { formatLocationStatus, readPreferences, updatePreferences } from "@/lib/preferences";
import rangrootsLogo from "../res/rangroots.png";

function BrandEmblem() {
  return (
    <Image
      src={rangrootsLogo}
      alt="Rangroots logo"
      className="brand-emblem"
      priority
      sizes="(max-width: 768px) 80vw, 760px"
    />
  );
}

const LANDING_CITY_ID = "berlin";

type GuideGroup = {
  key: FestivalEntry["category"];
  title: string;
  subtitle: string;
  items: FestivalEntry[];
};

type FallbackContent = {
  monthData: MonthlyPanchangResponse;
  festivals: FestivalEntry[];
  highlights: CalendarHighlight[];
  events: EventSummary[];
  resolvedCityId: string;
  resolvedCityName: string;
  timezone: string;
};

const GUIDE_GROUP_META: Record<FestivalEntry["category"], Omit<GuideGroup, "items" | "key">> = {
  festival: {
    title: "Hindu Festivals",
    subtitle: "A calendar of widely celebrated observances and holy days",
  },
  deity: {
    title: "Celebrating Deities in Hinduism",
    subtitle: "Festivals dedicated to deities, sacred stories, and seasonal observances",
  },
  observance: {
    title: "Hindu Observances",
    subtitle: "Days of reflection, remembrance, and spiritual practice",
  },
  other: {
    title: "Celebrating Other Dharma Traditions",
    subtitle: "Observances honored by Buddhist, Jain, and Sikh communities",
  },
};

function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function parseDateLocal(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateOnlyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO(): string {
  return toDateOnlyLocal(new Date());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthContainsDate(monthKey: string, dateString: string): boolean {
  return dateString.startsWith(`${monthKey}-`);
}

function getMonthInfo(monthKey: string): { year: number; month: number; daysInMonth: number } {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, daysInMonth };
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function clampDay(day: number, daysInMonth: number): number {
  return Math.min(Math.max(day, 1), daysInMonth);
}

function toEventLocalDate(value: string): string {
  return value.slice(0, 10);
}

function eventOccursOnDate(item: EventSummary, dateString: string): boolean {
  const start = toEventLocalDate(item.start_datetime);
  const end = toEventLocalDate(item.end_datetime ?? item.start_datetime);
  return start <= dateString && end >= dateString;
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getDateHeading(dateString: string): string {
  return parseDateOnly(dateString).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortenTithi(tithi: string): string {
  return tithi.replace("Shukla ", "S. ").replace("Krishna ", "K. ");
}

function formatDateOnly(dateString: string, options: Intl.DateTimeFormatOptions): string {
  return parseDateOnly(dateString).toLocaleDateString(undefined, {
    ...options,
    timeZone: "UTC",
  });
}

function formatFestivalDate(item: FestivalEntry): string {
  if (!item.end_date || item.end_date === item.date) {
    return formatDateOnly(item.date, { month: "long", day: "numeric", year: "numeric" });
  }

  const start = parseDateOnly(item.date);
  const end = parseDateOnly(item.end_date);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();

  if (sameMonth) {
    return `${formatDateOnly(item.date, { month: "long", day: "numeric" })}–${formatDateOnly(item.end_date, { day: "numeric", year: "numeric" })}`;
  }

  return `${formatDateOnly(item.date, { month: "long", day: "numeric" })}–${formatDateOnly(item.end_date, { month: "long", day: "numeric", year: "numeric" })}`;
}

function formatEventDetail(item: EventSummary): string {
  const start = new Date(item.start_datetime);
  const end = item.end_datetime ? new Date(item.end_datetime) : null;
  const sameDay = end
    ? start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()
    : false;

  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end ? end.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
  const dateLabel = end && !sameDay ? `${startLabel} - ${endLabel}` : startLabel;

  return [dateLabel, item.venue_name].filter(Boolean).join(" • ");
}

function formatClock(value?: string): string {
  if (!value || value.length < 16) {
    return "--:--";
  }
  return value.slice(11, 16);
}

function buildFallbackContent(monthKey: string, cityId: string): FallbackContent {
  const cityName = CITIES.find((city) => city.id === cityId)?.label ?? "Berlin";
  const timezone = "Europe/Berlin";
  const { year, month, daysInMonth } = getMonthInfo(monthKey);

  const primaryFestivalDate = toIsoDate(year, month, clampDay(8, daysInMonth));
  const secondaryFestivalDate = toIsoDate(year, month, clampDay(15, daysInMonth));
  const tertiaryFestivalDate = toIsoDate(year, month, clampDay(23, daysInMonth));

  const festivals: FestivalEntry[] = [
    {
      id: `${monthKey}-fallback-festival-1`,
      name: "Community Festival Gathering",
      date: primaryFestivalDate,
      category: "festival",
      description: "A curated placeholder while live festival feeds reconnect.",
    },
    {
      id: `${monthKey}-fallback-deity-1`,
      name: "Deity Devotion Day",
      date: secondaryFestivalDate,
      category: "deity",
      description: "Temples and homes observe prayers and devotional offerings.",
    },
    {
      id: `${monthKey}-fallback-observance-1`,
      name: "Monthly Reflection Observance",
      date: tertiaryFestivalDate,
      category: "observance",
      description: "A day set aside for study, seva, and mindful reflection.",
    },
    {
      id: `${monthKey}-fallback-other-1`,
      name: "Dharma Community Heritage Meetup",
      date: toIsoDate(year, month, clampDay(27, daysInMonth)),
      category: "other",
      description: "Shared heritage activities across Dharma traditions.",
    },
  ];

  const highlights: CalendarHighlight[] = [
    {
      id: `${monthKey}-fallback-highlight-1`,
      name: "Community Festival Week",
      start_date: primaryFestivalDate,
      end_date: toIsoDate(year, month, clampDay(10, daysInMonth)),
      category: "festival",
    },
    {
      id: `${monthKey}-fallback-highlight-2`,
      name: "Dharma Heritage Circle",
      start_date: tertiaryFestivalDate,
      end_date: tertiaryFestivalDate,
      category: "other",
    },
  ];

  const events: EventSummary[] = [
    {
      id: `${monthKey}-fallback-event-1`,
      city_id: cityId,
      title: "Panchang Study Circle",
      description: "Weekly community session on Panchang basics and observances.",
      start_datetime: `${toIsoDate(year, month, clampDay(9, daysInMonth))}T18:30:00+02:00`,
      end_datetime: `${toIsoDate(year, month, clampDay(9, daysInMonth))}T20:00:00+02:00`,
      venue_name: `${cityName} Cultural Hall`,
      event_category: "community",
      is_free: true,
    },
    {
      id: `${monthKey}-fallback-event-2`,
      city_id: cityId,
      title: "Family Heritage Workshop",
      description: "Hands-on session for rituals, songs, and storytelling.",
      start_datetime: `${toIsoDate(year, month, clampDay(16, daysInMonth))}T11:00:00+02:00`,
      end_datetime: `${toIsoDate(year, month, clampDay(16, daysInMonth))}T13:00:00+02:00`,
      venue_name: `${cityName} Community Center`,
      event_category: "education",
      is_free: false,
    },
    {
      id: `${monthKey}-fallback-event-3`,
      city_id: cityId,
      title: "Temple Volunteer Day",
      description: "Neighborhood seva and temple support program.",
      start_datetime: `${toIsoDate(year, month, clampDay(24, daysInMonth))}T09:30:00+02:00`,
      end_datetime: `${toIsoDate(year, month, clampDay(24, daysInMonth))}T12:00:00+02:00`,
      venue_name: `${cityName} Mandir`,
      event_category: "seva",
      is_free: true,
    },
  ];

  const festivalByDate = festivals.reduce<Record<string, string[]>>((acc, festival) => {
    if (!acc[festival.date]) {
      acc[festival.date] = [];
    }
    acc[festival.date].push(festival.name);
    return acc;
  }, {});

  const days: DailyPanchang[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = toIsoDate(year, month, day);
    return {
      date,
      city_id: cityId,
      location_context: {
        requested_latitude: undefined,
        requested_longitude: undefined,
        resolved_city_id: cityId,
        resolved_city_name: cityName,
        timezone,
        distance_km: 0,
      },
      tithi: "Panchang guidance available soon",
      paksha: "Community fallback",
      nakshatra: "Pending sync",
      yoga: "Pending sync",
      karana: "Pending sync",
      sunrise: `${date}T06:00:00+02:00`,
      sunset: `${date}T18:00:00+02:00`,
      festivals: festivalByDate[date] ?? [],
      muhurtas: {},
    };
  });

  return {
    monthData: {
      month: monthKey,
      city_id: cityId,
      location_context: {
        requested_latitude: undefined,
        requested_longitude: undefined,
        resolved_city_id: cityId,
        resolved_city_name: cityName,
        timezone,
        distance_km: 0,
      },
      days,
    },
    festivals,
    highlights,
    events,
    resolvedCityId: cityId,
    resolvedCityName: cityName,
    timezone,
  };
}

function buildGuideGroups(festivals: FestivalEntry[]): GuideGroup[] {
  return (["festival", "deity", "observance", "other"] as const).map((category) => ({
    key: category,
    ...GUIDE_GROUP_META[category],
    items: festivals
      .filter((festival) => festival.category === category)
      .sort((left, right) => left.date.localeCompare(right.date)),
  }));
}

function expandDateRange(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

export default function HomePage() {
  const initialMonth = startOfMonth(new Date());
  const initialMonthKey = toMonthKey(initialMonth);
  const initialFallback = buildFallbackContent(initialMonthKey, LANDING_CITY_ID);

  const [locationStatus, setLocationStatus] = useState("Waiting for location consent");
  const [selectedCityId, setSelectedCityId] = useState(LANDING_CITY_ID);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [savedCoords, setSavedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [monthData, setMonthData] = useState<MonthlyPanchangResponse | null>(initialFallback.monthData);
  const [monthEvents, setMonthEvents] = useState<EventSummary[]>(initialFallback.events);
  const [guideGroups, setGuideGroups] = useState<GuideGroup[]>(buildGuideGroups(initialFallback.festivals));
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>(initialFallback.highlights);
  const [resolvedCityName, setResolvedCityName] = useState(initialFallback.resolvedCityName);
  const [resolvedTimezone, setResolvedTimezone] = useState(initialFallback.timezone);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);

  const monthKey = useMemo(() => toMonthKey(selectedMonth), [selectedMonth]);
  const selectedYear = useMemo(() => selectedMonth.getFullYear(), [selectedMonth]);
  const selectedCalendarDate = useMemo(() => parseDateLocal(selectedDate), [selectedDate]);
  const panchangByDate = useMemo(() => {
    const entries = new Map<string, DailyPanchang>();
    monthData?.days.forEach((day) => entries.set(day.date, day));
    return entries;
  }, [monthData]);
  const selectedDay = useMemo(() => panchangByDate.get(selectedDate) ?? null, [panchangByDate, selectedDate]);
  const selectedDayEvents = useMemo(
    () => monthEvents.filter((event) => eventOccursOnDate(event, selectedDate)),
    [monthEvents, selectedDate]
  );
  const visibleUpcoming = useMemo(() => {
    const upcomingFromSelectedDay = monthEvents.filter(
      (event) => toEventLocalDate(event.end_datetime ?? event.start_datetime) >= selectedDate
    );
    return (selectedDayEvents.length > 0 ? selectedDayEvents : upcomingFromSelectedDay).slice(0, 6);
  }, [monthEvents, selectedDate, selectedDayEvents]);
  const highlightDays = useMemo(
    () =>
      Array.from(
        new Set(
          calendarHighlights.flatMap((highlight) => expandDateRange(highlight.start_date, highlight.end_date))
        )
      ).map((date) => parseDateLocal(date)),
    [calendarHighlights]
  );
  const eventDays = useMemo(
    () => Array.from(new Set(monthEvents.map((event) => toEventLocalDate(event.start_datetime)))).map((date) => parseDateLocal(date)),
    [monthEvents]
  );
  const festivalDays = useMemo(
    () =>
      (monthData?.days ?? [])
        .filter((day) => day.festivals.length > 0)
        .map((day) => parseDateLocal(day.date)),
    [monthData]
  );

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(startOfMonth(now));
    setSelectedDate(toDateOnlyLocal(now));

    const preferences = readPreferences();
    setSelectedCityId(preferences.preferredCityId);
    if (preferences.savedCoords) {
      setSavedCoords({ latitude: preferences.savedCoords.latitude, longitude: preferences.savedCoords.longitude });
    }
  }, []);

  useEffect(() => {
    if (!monthContainsDate(monthKey, selectedDate)) {
      setSelectedDate(`${monthKey}-01`);
    }
  }, [monthKey, selectedDate]);

  useEffect(() => {
    let cancelled = false;
    const homepageRequest: HomepageContentRequest = {
      month: monthKey,
      year: selectedYear,
      cityId: selectedCityId,
    };

    if (savedCoords) {
      homepageRequest.lat = savedCoords.latitude;
      homepageRequest.lng = savedCoords.longitude;
    }

    setContentLoading(true);

    const applyFallback = (message: string) => {
      const fallback = buildFallbackContent(monthKey, selectedCityId);
      setMonthData(fallback.monthData);
      setGuideGroups(buildGuideGroups(fallback.festivals));
      setCalendarHighlights(fallback.highlights);
      setMonthEvents(fallback.events);
      setResolvedCityName(fallback.resolvedCityName);
      setResolvedTimezone(fallback.timezone);
      setContentError(message);
    };

    getHomepageContent(homepageRequest)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const hasLiveData = Boolean(
          payload.monthData || payload.festivals.length > 0 || payload.highlights.length > 0 || payload.events.length > 0
        );

        if (!hasLiveData) {
          applyFallback("Live calendar services are unavailable right now. Showing curated fallback information.");
          return;
        }

        const fallback = buildFallbackContent(monthKey, selectedCityId);

        setMonthData(payload.monthData ?? fallback.monthData);
        setGuideGroups(buildGuideGroups(payload.festivals.length > 0 ? payload.festivals : fallback.festivals));
        setCalendarHighlights(payload.highlights.length > 0 ? payload.highlights : fallback.highlights);
        setMonthEvents(payload.events.length > 0 ? payload.events : fallback.events);
        setResolvedCityName(
          payload.resolvedCityName ?? CITIES.find((city) => city.id === payload.resolvedCityId)?.label ?? fallback.resolvedCityName
        );
        setResolvedTimezone(payload.timezone ?? fallback.timezone);

        setContentError(
          payload.errors.length > 0
            ? "Some live calendar data is temporarily unavailable. Showing a blended live and curated view."
            : null
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        applyFallback("Live calendar services are unavailable right now. Showing curated fallback information.");
      })
      .finally(() => {
        if (!cancelled) {
          setContentLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monthKey, savedCoords, selectedCityId, selectedYear]);

  useEffect(() => {
    setLocationStatus(formatLocationStatus(readPreferences()));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if ("geolocation" in navigator && navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          const permission = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "unknown";
          const next = updatePreferences({ locationPermission: permission });
          setLocationStatus(formatLocationStatus(next));
        })
        .catch(() => undefined);
    }
  }, []);

  const enableLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const next = updatePreferences({
          locationPermission: "granted",
          savedCoords: {
            latitude,
            longitude,
            updatedAt: new Date().toISOString(),
          },
        });
        setSavedCoords({ latitude, longitude });
        setLocationStatus(formatLocationStatus(next));
      },
      () => {
        const next = updatePreferences({ locationPermission: "denied", savedCoords: undefined });
        setSavedCoords(null);
        setLocationStatus(formatLocationStatus(next));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleCityChange = (cityId: string) => {
    const next = updatePreferences({ preferredCityId: cityId, savedCoords: undefined });
    setSelectedCityId(cityId);
    setSavedCoords(null);
    setLocationStatus(formatLocationStatus(next));
  };

  const handleMonthChange = (month: Date) => {
    setSelectedMonth(startOfMonth(month));
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    setSelectedDate(toDateOnlyLocal(date));
  };

  return (
    <main className="calendar-frame-page">

      <div className="guide-page">
        <div className="guide-page-inner">
          <header className="guide-topbar">
            <div className="guide-topbar-inner">
              <div className="guide-brand-wrap">
                <BrandEmblem />
              </div>

              <nav className="guide-nav" aria-label="Main navigation">
                <a href="#about">About</a>
                <a href="#calendar">Calendar</a>
                <a href="#learn">Learn</a>
                <a href="#community">Community</a>
                <a href="#donate">Donate</a>
              </nav>

              <button className="guide-menu-btn" type="button">Menu</button>
            </div>
          </header>

          <header className="guide-hero">
            <div className="guide-grid">
              <div>
                <p className="guide-eyebrow">{selectedYear} dharmic days &amp; hindu holidays calendar</p>
                <h2>A living Panchang and community calendar for Hindu heritage, rituals, and everyday culture.</h2>
                <div className="guide-cta-row">
                  <a href="#calendar" className="guide-btn guide-btn-primary">View Calendar</a>
                  <a href="#about" className="guide-btn guide-btn-ghost">Learn about the holidays</a>
                </div>
              </div>

              <div className="guide-poster" aria-label="Dharmic calendar poster">
                <div className="guide-poster-inner">
                  <span className="guide-poster-kicker">Dharmic Calendar</span>
                  <h2>Hindu holidays commemorate a particular deity, season or event in history, but do not necessarily fall on a specific day every year as the Hindu calendar is lunar.</h2>
                  <p>
                    Different traditions observe sacred days in their own way, and Rangroots helps communities
                    find the right rhythm for learning, celebration, and reflection.
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="guide-intro" id="about">
            <p>
              Different Hindu traditions, lineages, and communities may observe distinct days of spiritual
              importance in their own way. Rangroots brings that lived heritage into a shared community
              calendar and Panchang experience.
            </p>
          </div>

          <div className="location-banner">
            <span>{locationStatus}</span>
            <div className="location-banner-actions">
              <a href="/privacy-policy">Privacy</a>
              <a href="/settings">Settings</a>
              <button onClick={enableLocation}>Use my location</button>
            </div>
          </div>

          <section className="calendar-frame-wrap">
            <div className="event-list-panel">
              <div className="panel-head">
                <div>
                  <h2>{selectedDayEvents.length > 0 ? "Selected day events" : "Upcoming events"}</h2>
                  <p className="panel-subtitle">
                    {selectedDayEvents.length > 0 ? getDateHeading(selectedDate) : `From ${getDateHeading(selectedDate)} in ${resolvedCityName}`}
                  </p>
                </div>
                <label className="city-filter">
                  <span>City</span>
                  <select value={selectedCityId} onChange={(event) => handleCityChange(event.target.value)}>
                    {CITIES.map((city) => (
                      <option key={city.id} value={city.id}>{city.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedDay ? (
                <div className="selected-day-panel">
                  <div>
                    <p className="selected-day-kicker">Selected Panchang</p>
                    <h3>{getDateHeading(selectedDate)}</h3>
                  </div>
                  <div className="selected-day-grid">
                    <div>
                      <span>Tithi</span>
                      <strong>{selectedDay.tithi}</strong>
                    </div>
                    <div>
                      <span>Nakshatra</span>
                      <strong>{selectedDay.nakshatra}</strong>
                    </div>
                    <div>
                      <span>Sunrise</span>
                      <strong>{formatClock(selectedDay.sunrise)}</strong>
                    </div>
                    <div>
                      <span>Sunset</span>
                      <strong>{formatClock(selectedDay.sunset)}</strong>
                    </div>
                  </div>
                  {selectedDay.festivals.length > 0 ? (
                    <div className="selected-day-tags">
                      {selectedDay.festivals.map((festival) => (
                        <span key={festival}>{festival}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="event-list-scroll">
                {contentLoading && visibleUpcoming.length === 0 ? (
                  <p className="panel-empty">Loading upcoming events...</p>
                ) : null}

                {!contentLoading && visibleUpcoming.length === 0 ? (
                  <p className="panel-empty">No events are scheduled for this city and date selection yet.</p>
                ) : null}

                {visibleUpcoming.map((item) => (
                  <article className="event-row" key={item.id}>
                    <span className="event-dot" aria-hidden="true" />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{formatEventDetail(item)}</p>
                      <span className="event-chip">{item.event_category}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="panel-timezone">
                <span className="tz-icon" aria-hidden="true">◔</span>
                <span>Events shown in</span>
                <strong>{resolvedTimezone} • {resolvedCityName}</strong>
              </div>
            </div>

            <div className="month-panel">
              <h1>Dharmic Days and Hindu Holidays</h1>

              <div className="month-toolbar-shell">
                <span className="month-toolbar-label">Calendar month</span>
                <strong>{getMonthLabel(monthKey)}</strong>
              </div>

              <div className="calendar-shell">
                <DayPicker
                  mode="single"
                  month={selectedMonth}
                  selected={selectedCalendarDate}
                  onMonthChange={handleMonthChange}
                  onSelect={handleDaySelect}
                  showOutsideDays
                  weekStartsOn={1}
                  modifiers={{
                    festival: festivalDays,
                    hasEvent: eventDays,
                    highlight: highlightDays,
                  }}
                  modifiersClassNames={{
                    festival: "rr-day-festival",
                    hasEvent: "rr-day-event",
                    highlight: "rr-day-highlight",
                  }}
                  formatters={{
                    formatWeekdayName: (date) =>
                      date.toLocaleDateString(undefined, {
                        weekday: "short",
                      }),
                  }}
                  className="rangroots-daypicker"
                />
              </div>

              <div className="month-footer">
                <span>Panchang and events update with the selected month, city, and saved location.</span>
                <strong>{savedCoords ? `Location-assisted view • ${resolvedCityName}` : `City view • ${resolvedCityName}`}</strong>
              </div>
            </div>
          </section>

          <section className="guide-sections" id="calendar">
            {contentLoading && guideGroups.length === 0 ? (
              <p className="guide-status">Loading calendar data...</p>
            ) : null}

            {contentError ? <p className="guide-status">{contentError}</p> : null}

            {guideGroups.map((group) => (
              <div className="guide-group" key={group.title}>
                <div className="guide-group-head">
                  <h3>{group.title}</h3>
                  <p>{group.subtitle}</p>
                </div>

                <div className="guide-cards">
                  {group.items.map((item) => (
                    <article className="guide-card" key={`${group.title}-${item.name}`}>
                      <p className="guide-date">{formatFestivalDate(item)}</p>
                      <h4>{item.name}</h4>
                      <p className="guide-note">{item.description ?? "Religious observance and community celebration"}</p>
                      <a href="#" className="guide-read-link">Read ↗</a>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <footer className="guide-footer">
            <p>
              Below is a list of some of the more widely celebrated Hindu holidays and days of significance to
              Dharma traditions for accommodation, observation, and celebration. Rangroots brings together
              Panchang guidance, community events, and heritage traditions in one place.
            </p>
            <a href="#">Download the Hindu Holidays Calendar</a>
          </footer>
        </div>
      </div>
    </main>
  );
}
