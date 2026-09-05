"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

function addDays(dateString: string, days: number): string {
  const date = parseDateOnly(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

function buildGuideGroups(festivals: FestivalEntry[]): GuideGroup[] {
  return (["festival", "deity", "observance", "other"] as const).map((category) => ({
    key: category,
    ...GUIDE_GROUP_META[category],
    items: festivals
      .filter((festival) => festival.category === category)
      .sort((left, right) => left.date.localeCompare(right.date)),
  }));
}

function buildCalendarEvents(highlights: CalendarHighlight[], events: EventSummary[]) {
  const highlightEvents = highlights.map((highlight) => ({
    id: `highlight-${highlight.id}`,
    title: highlight.name,
    start: highlight.start_date,
    end: addDays(highlight.end_date, 1),
    allDay: true,
    classNames: ["rangroots-highlight", `rangroots-highlight-${highlight.category}`],
  }));

  const communityEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start_datetime,
    end: event.end_datetime,
    allDay: false,
    classNames: ["rangroots-community-event"],
  }));

  return [...highlightEvents, ...communityEvents];
}

export default function HomePage() {
  const [locationStatus, setLocationStatus] = useState("Waiting for location consent");
  const [selectedCityId, setSelectedCityId] = useState(LANDING_CITY_ID);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [savedCoords, setSavedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [monthData, setMonthData] = useState<MonthlyPanchangResponse | null>(null);
  const [monthEvents, setMonthEvents] = useState<EventSummary[]>([]);
  const [guideGroups, setGuideGroups] = useState<GuideGroup[]>([]);
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([]);
  const [resolvedCityName, setResolvedCityName] = useState("Berlin");
  const [resolvedTimezone, setResolvedTimezone] = useState("Europe/Berlin");
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);

  const monthKey = useMemo(() => toMonthKey(selectedMonth), [selectedMonth]);
  const selectedYear = useMemo(() => selectedMonth.getFullYear(), [selectedMonth]);
  const calendarEvents = useMemo(() => buildCalendarEvents(calendarHighlights, monthEvents), [calendarHighlights, monthEvents]);
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

  useEffect(() => {
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

    getHomepageContent(homepageRequest)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setMonthData(payload.monthData);
        setGuideGroups(buildGuideGroups(payload.festivals));
        setCalendarHighlights(payload.highlights);
        setMonthEvents(payload.events);
        setResolvedCityName(payload.resolvedCityName ?? CITIES.find((city) => city.id === payload.resolvedCityId)?.label ?? "Berlin");
        setResolvedTimezone(payload.timezone ?? "Europe/Berlin");

        if (payload.errors.length > 0) {
          setContentError("Some live calendar data is temporarily unavailable.");
        } else {
          setContentError(null);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setContentError("Live calendar data is unavailable until the backend services are running.");
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
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        const permission = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "unknown";
        const next = updatePreferences({ locationPermission: permission });
        setLocationStatus(formatLocationStatus(next));
      });
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

  const handleDatesSet = (arg: { view: { currentStart: Date } }) => {
    setSelectedMonth(startOfMonth(arg.view.currentStart));
  };

  const handleDateClick = (arg: { dateStr: string }) => {
    setSelectedDate(arg.dateStr);
  };

  const decorateDayCell = (arg: { date: Date; el: HTMLElement }) => {
    const dayInfo = panchangByDate.get(arg.date.toISOString().slice(0, 10));
    const frame = arg.el.querySelector(".fc-daygrid-day-frame");

    if (!frame) {
      return;
    }

    const existing = frame.querySelector(".rangroots-day-meta");
    if (existing) {
      existing.remove();
    }

    if (!dayInfo) {
      return;
    }

    const meta = document.createElement("div");
    meta.className = "rangroots-day-meta";

    const tithi = document.createElement("span");
    tithi.className = "rangroots-day-tithi";
    tithi.textContent = shortenTithi(dayInfo.tithi);
    meta.appendChild(tithi);

    if (dayInfo.festivals.length > 0) {
      const count = document.createElement("span");
      count.className = "rangroots-day-count";
      count.textContent = `${dayInfo.festivals.length} observance${dayInfo.festivals.length > 1 ? "s" : ""}`;
      meta.appendChild(count);
    }

    frame.appendChild(meta);
  };

  const calendarProps: Record<string, unknown> = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: "dayGridMonth",
    initialDate: selectedDate,
    fixedWeekCount: false,
    selectable: true,
    weekends: true,
    events: calendarEvents,
    dateClick: handleDateClick,
    eventClick: (arg: { event: { startStr: string } }) => setSelectedDate(arg.event.startStr.slice(0, 10)),
    datesSet: handleDatesSet,
    dayCellDidMount: decorateDayCell,
    height: "auto",
    headerToolbar: {
      left: "today prev,next",
      center: "title",
      right: "dayGridMonth",
    },
    dayMaxEventRows: 3,
  };

  return (
    <main className="calendar-frame-page">
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
                  <strong>{selectedDay.sunrise.slice(11, 16)}</strong>
                </div>
                <div>
                  <span>Sunset</span>
                  <strong>{selectedDay.sunset.slice(11, 16)}</strong>
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
            <FullCalendar {...(calendarProps as Record<string, unknown>)} />
          </div>

          <div className="month-footer">
            <span>Panchang and events update with the selected month, city, and saved location.</span>
            <strong>{savedCoords ? `Location-assisted view • ${resolvedCityName}` : `City view • ${resolvedCityName}`}</strong>
          </div>
        </div>
      </section>

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
                <h1 className="guide-title">A living Panchang and community calendar for Hindu heritage, rituals, and everyday culture.</h1>
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
