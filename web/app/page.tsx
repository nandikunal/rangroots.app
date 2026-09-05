"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  getCalendarHighlights,
  getFestivals,
  listEvents,
  type CalendarHighlight,
  type EventSummary,
  type FestivalEntry,
} from "@/lib/api";
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
const LANDING_MONTH = "2026-09";
const LANDING_YEAR = 2026;
const WEEKDAY_HEADINGS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

function buildCalendarCells(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const leadingBlanks = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const cells = [...WEEKDAY_HEADINGS, ...Array.from({ length: leadingBlanks }, () => "")];
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(String(day));
  }
  while (cells.length < 49) {
    cells.push("");
  }
  return cells;
}

function buildCalendarBars(highlights: CalendarHighlight[], month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));
  const leadingBlanks = (monthStart.getUTCDay() + 6) % 7;

  return highlights.flatMap((highlight) => {
    const originalStart = parseDateOnly(highlight.start_date);
    const originalEnd = parseDateOnly(highlight.end_date);

    if (originalEnd < monthStart || originalStart > monthEnd) {
      return [];
    }

    const start = originalStart < monthStart ? monthStart : originalStart;
    const end = originalEnd > monthEnd ? monthEnd : originalEnd;
    const segments: Array<{ key: string; name: string; gridColumn: string; gridRow: string }> = [];
    let cursor = new Date(start);
    let index = 0;

    while (cursor <= end) {
      const weekdayIndex = (cursor.getUTCDay() + 6) % 7;
      const weekIndex = Math.floor((leadingBlanks + cursor.getUTCDate() - 1) / 7);
      const weekEnd = new Date(cursor);
      weekEnd.setUTCDate(cursor.getUTCDate() + (6 - weekdayIndex));
      const segmentEnd = weekEnd < end ? weekEnd : end;
      const span = Math.round((segmentEnd.getTime() - cursor.getTime()) / 86400000) + 1;

      segments.push({
        key: `${highlight.id}-${index}`,
        name: highlight.name,
        gridColumn: `${weekdayIndex + 1} / span ${span}`,
        gridRow: String(2 + weekIndex),
      });

      cursor = new Date(segmentEnd);
      cursor.setUTCDate(segmentEnd.getUTCDate() + 1);
      index += 1;
    }

    return segments;
  });
}

export default function HomePage() {
  const [locationStatus, setLocationStatus] = useState("Waiting for location consent");
  const [upcoming, setUpcoming] = useState<EventSummary[]>([]);
  const [guideGroups, setGuideGroups] = useState<GuideGroup[]>([]);
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);

  const calendarCells = useMemo(() => buildCalendarCells(LANDING_MONTH), []);
  const calendarBars = useMemo(() => buildCalendarBars(calendarHighlights, LANDING_MONTH), [calendarHighlights]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      getFestivals(LANDING_YEAR, LANDING_CITY_ID),
      getCalendarHighlights(LANDING_MONTH, LANDING_CITY_ID),
      listEvents({ from: `${LANDING_MONTH}-01` }),
    ]).then(([festivalsResult, highlightsResult, eventsResult]) => {
      if (cancelled) {
        return;
      }

      if (festivalsResult.status === "fulfilled") {
        setGuideGroups(buildGuideGroups(festivalsResult.value));
      }

      if (highlightsResult.status === "fulfilled") {
        setCalendarHighlights(highlightsResult.value);
      }

      if (eventsResult.status === "fulfilled") {
        setUpcoming(eventsResult.value.slice(0, 5));
      }

      if (
        festivalsResult.status === "rejected" ||
        highlightsResult.status === "rejected" ||
        eventsResult.status === "rejected"
      ) {
        setContentError("Live calendar data is unavailable until the backend services are running.");
      } else {
        setContentError(null);
      }

      setContentLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if ("geolocation" in navigator && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        setLocationStatus(
          result.state === "granted"
            ? "Location enabled for local Panchang calculations"
            : "Location access is off. Enable it to personalize your local calendar."
        );
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
        setLocationStatus(`Location enabled: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      () => {
        setLocationStatus("Location denied. You can re-enable via browser settings.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <main className="calendar-frame-page">
      <div className="location-banner">
        <span>{locationStatus}</span>
        <button onClick={enableLocation}>Use my location</button>
      </div>

      <section className="calendar-frame-wrap">
        <div className="event-list-panel">
          <div className="panel-head">
            <h2>Upcoming events</h2>
            <button className="chev-btn" aria-label="Expand upcoming events">⌄</button>
            <button className="subscribe-btn">Subscribe</button>
          </div>

          <div className="event-list-scroll">
            {contentLoading && upcoming.length === 0 ? (
              <p className="panel-empty">Loading upcoming events...</p>
            ) : null}

            {!contentLoading && upcoming.length === 0 ? (
              <p className="panel-empty">No upcoming events available right now.</p>
            ) : null}

            {upcoming.map((item) => (
              <article className="event-row" key={item.id}>
                <span className="event-dot" aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{formatEventDetail(item)}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="panel-timezone">
            <span className="tz-icon" aria-hidden="true">◔</span>
            <span>Time shown in</span>
            <strong>(GMT+02:00) Europe, Berlin</strong>
          </div>
          <div className="panel-powered">Powered by AddEvent</div>
        </div>

        <div className="month-panel">
          <h1>Dharmic Days and Hindu Holidays</h1>

          <div className="month-toolbar">
            <div className="toolbar-left">
              <button>Today</button>
              <button aria-label="Previous month">‹</button>
              <button aria-label="Next month">›</button>
              <button>September 2026 ⌄</button>
            </div>
            <div className="toolbar-right">
              <button aria-label="Search">⌕</button>
              <button aria-label="Print">⎙</button>
              <button>Month ⌄</button>
              <button className="follow-btn">Follow Calendar</button>
            </div>
          </div>

          <div className="calendar-grid">
            {calendarCells.map((cell, idx) => (
              <div key={`${cell}-${idx}`} className={`cell ${idx < 7 ? "cell-head" : ""}`}>
                {cell}
              </div>
            ))}

            {calendarBars.map((bar) => (
              <div key={bar.key} className="bar" style={{ gridColumn: bar.gridColumn, gridRow: bar.gridRow }}>
                {bar.name}
              </div>
            ))}
          </div>

          <div className="month-footer">
            <span>Events shown in time zone:</span>
            <button>Europe, Berlin (GMT+02:00) ⌄</button>
            <strong>Powered by AddEvent</strong>
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
                <p className="guide-eyebrow">2026 dharmic days &amp; hindu holidays calendar</p>
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
