"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getDailyPanchang,
  getFestivals,
  listEvents,
  DailyPanchang,
  FestivalEntry,
  EventSummary,
  CITIES,
} from "@/lib/api";

// Unified Calendar + Events page with motion polish (Option A).
// Same data flow as before; adds scroll-staggered fade-in via a single
// IntersectionObserver, hover lift/glow on cards, a live countdown chip
// in the hero showing time until the next muhurta band, a custom-styled
// city dropdown, and muted ambient glyphs as background flourishes.
// No animation library — pure CSS + IntersectionObserver, edge-safe.

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_META: Record<string, { label: string; accent: string; emoji: string }> = {
  festival: { label: "Hindu Festivals", accent: "text-orange-700", emoji: String.fromCharCode(0x1F3EE) },
  deity: { label: "Celebrating Deities", accent: "text-purple-700", emoji: String.fromCharCode(0x1F6D5) },
  observance: { label: "Hindu Observances", accent: "text-blue-700", emoji: String.fromCharCode(0x1F4FF) },
  other: { label: "Other Dharma Traditions", accent: "text-emerald-700", emoji: String.fromCharCode(0x2728) },
};
const CATEGORY_ORDER = ["festival", "deity", "observance", "other"];

// Major festivals get a visual weight bump (larger card treatment).
const MAJOR_FESTIVALS = new Set(["diwali", "holi", "navratri"]);

function formatCountdown(targetIso: string | undefined): string | null {
  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CalendarPage() {
  const [cityId, setCityId] = useState("berlin");
  const [date] = useState(todayISO());
  const [panchang, setPanchang] = useState<DailyPanchang | null>(null);
  const [festivals, setFestivals] = useState<FestivalEntry[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sectionsRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);

  const year = useMemo(() => new Date(date).getFullYear(), [date]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      getDailyPanchang(date, cityId),
      getFestivals(year, cityId),
      listEvents({ cityId, from: date }),
    ]).then(([p, f, e]) => {
      if (p.status === "fulfilled") setPanchang(p.value);
      else setError("Panchang data isn't available yet.");
      if (f.status === "fulfilled") setFestivals(f.value);
      if (e.status === "fulfilled") setEvents(e.value.slice(0, 6));
      setLoading(false);
    });
  }, [date, cityId, year]);

  // Live countdown to the next muhurta band (Abhijit or Rahu Kaal, whichever is next)
  useEffect(() => {
    if (!panchang) return;
    const tick = () => {
      const abhijit = panchang.muhurtas?.abhijit_muhurta as { start?: string } | undefined;
      const rahu = panchang.muhurtas?.rahu_kaal as { start?: string } | undefined;
      const abhijitCd = formatCountdown(abhijit?.start);
      const rahuCd = formatCountdown(rahu?.start);
      if (abhijitCd && (!rahuCd || new Date(abhijit!.start!) < new Date(rahu!.start!))) {
        setCountdown(abhijitCd);
        setCountdownLabel("Abhijit Muhurta");
      } else if (rahuCd) {
        setCountdown(rahuCd);
        setCountdownLabel("Rahu Kaal");
      } else {
        setCountdown(null);
        setCountdownLabel(null);
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [panchang]);

  // Scroll-staggered fade-in for festival sections
  useEffect(() => {
    if (!sectionsRef.current) return;
    const sections = sectionsRef.current.querySelectorAll(".fade-section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [festivals, events]);

  const grouped = useMemo(() => {
    const g: Record<string, FestivalEntry[]> = {};
    for (const f of festivals) {
      const key = CATEGORY_META[f.category] ? f.category : "other";
      (g[key] ??= []).push(f);
    }
    Object.values(g).forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)));
    return g;
  }, [festivals]);

  return (
    <main className="min-h-screen bg-[var(--zen-mist)]">
      {/* Hero: meditative "today" focal point with ambient glyphs + live countdown */}
      <section className="zen-hero text-white px-6 py-16 md:py-24">
        <span className="zen-glyph-bg" style={{ top: "-2rem", left: "-3rem" }} aria-hidden="true">ॐ</span>
        <span className="zen-glyph-bg" style={{ bottom: "-3rem", right: "-2rem", fontSize: "12rem" }} aria-hidden="true">॥</span>
        <div className="mx-auto max-w-3xl text-center relative">
          <p className="zen-sans text-xs tracking-[0.3em] uppercase text-white/50 mb-4">
            Today &middot; {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>

          {loading && <div className="h-24 w-64 mx-auto rounded-full bg-white/5 animate-pulse" />}

          {panchang && !loading && (
            <>
              <h1 className="zen-serif text-4xl md:text-6xl font-medium text-white mb-2">
                {panchang.tithi}
              </h1>
              <p className="zen-serif text-lg text-[var(--zen-saffron-300)] mb-6">{panchang.paksha} Paksha</p>

              {panchang.festivals?.length > 0 && (
                <div className="inline-block mb-6 rounded-full border border-[var(--zen-saffron-400)]/50 bg-white/5 px-5 py-2 text-sm text-[var(--zen-saffron-300)]">
                  Celebrating {panchang.festivals.join(", ")} today
                </div>
              )}

              {countdown && countdownLabel && (
                <div className="flex justify-center items-center gap-2 mb-6 text-xs text-white/60">
                  <span className="zen-countdown-dot" />
                  <span>{countdownLabel} begins in {countdown}</span>
                </div>
              )}

              <div className="flex justify-center gap-10 text-white/70 text-sm mb-6">
                <span>&#9728;&#65039; Sunrise &middot; {panchang.sunrise?.slice(11, 16)}</span>
                <span>&#127769; Sunset &middot; {panchang.sunset?.slice(11, 16)}</span>
              </div>

              <button
                onClick={() => setShowDetails((s) => !s)}
                className="text-xs tracking-wide uppercase text-white/40 hover:text-white/70 transition"
              >
                {showDetails ? "Hide finer details" : "Reveal finer details"}
              </button>

              {showDetails && (
                <div className="mt-6 zen-card rounded-2xl px-6 py-5 text-left text-white/80 text-sm max-w-sm mx-auto space-y-2 bg-white/5">
                  <div className="flex justify-between"><span className="text-white/50">Nakshatra</span><span>{panchang.nakshatra}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Yoga</span><span>{panchang.yoga}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Karana</span><span>{panchang.karana}</span></div>
                </div>
              )}
            </>
          )}

          {error && !loading && (
            <p className="text-white/60 text-sm">{error}</p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 -mt-8 relative z-10">
        <div className="flex justify-center">
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="zen-select"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div ref={sectionsRef} className="mx-auto max-w-5xl px-6 pt-16 pb-20">
        <div className="text-center mb-14">
          <h2 className="zen-serif text-3xl text-[var(--zen-ink)] mb-2">{year} Dharmic Calendar</h2>
          <p className="text-[var(--zen-ink-soft)] text-sm">A guide to festivals, deities, and observances through the year</p>
        </div>

        <div className="space-y-16">
          {CATEGORY_ORDER.map((cat) => {
            const list = grouped[cat];
            if (!list || list.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <section key={cat} className="fade-section">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl">{meta.emoji}</span>
                  <h3 className={`zen-serif text-2xl font-medium ${meta.accent}`}>{meta.label}</h3>
                  <div className="zen-divider flex-1" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((f) => {
                    const isToday = f.date === date;
                    const isMajor = MAJOR_FESTIVALS.has(f.id);
                    return (
                      <div
                        key={f.name + f.date}
                        className={`rounded-2xl p-5 transition ${
                          isToday ? "zen-card-today zen-glow-ring" : "zen-card"
                        } ${isMajor ? "sm:col-span-2" : ""}`}
                      >
                        <div className="text-xs font-medium tracking-wide uppercase text-[var(--zen-ink-soft)]">
                          {new Date(f.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {isToday && <span className="ml-2 text-[var(--zen-saffron-400)]">&bull; Today</span>}
                        </div>
                        <div className={`zen-serif font-medium text-[var(--zen-ink)] mt-2 ${isMajor ? "text-xl" : "text-lg"}`}>
                          {f.name}
                        </div>
                        {f.description && (
                          <p className="text-sm text-[var(--zen-ink-soft)] mt-2 leading-relaxed">{f.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {festivals.length === 0 && !loading && (
            <p className="text-center text-[var(--zen-ink-soft)] text-sm">
              Festival data isn&apos;t available yet for this city and year.
            </p>
          )}
        </div>

        <div className="mt-20 fade-section">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xl">&#127961;&#65039;</span>
            <h3 className="zen-serif text-2xl font-medium text-[var(--zen-ink)]">
              Gathering in {CITIES.find((c) => c.id === cityId)?.label}
            </h3>
            <div className="zen-divider flex-1" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {events.map((e) => (
              <div key={e.id} className="zen-card rounded-2xl p-5">
                <div className="text-xs font-medium tracking-wide uppercase text-[var(--zen-ink-soft)]">
                  {new Date(e.start_datetime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {e.venue_name && <> &middot; {e.venue_name}</>}
                </div>
                <div className="zen-serif text-lg font-medium text-[var(--zen-ink)] mt-2">{e.title}</div>
                <p className="text-sm text-[var(--zen-ink-soft)] mt-2 line-clamp-2">{e.description}</p>
                <div className="mt-3 flex gap-2">
                  <span className="text-xs rounded-full px-3 py-1 bg-[var(--zen-saffron-400)]/15 text-[var(--zen-saffron-400)]">
                    {e.event_category}
                  </span>
                  <span className={`text-xs rounded-full px-3 py-1 ${e.is_free ? "bg-emerald-500/10 text-emerald-700" : "bg-[var(--zen-ink-soft)]/10 text-[var(--zen-ink-soft)]"}`}>
                    {e.is_free ? "Free" : "Paid"}
                  </span>
                </div>
              </div>
            ))}
            {events.length === 0 && !loading && (
              <p className="text-[var(--zen-ink-soft)] text-sm col-span-2">
                No upcoming events found for this city yet.
              </p>
            )}
          </div>
        </div>

        <div className="mt-16 text-center">
          <a href="/calendar/ritual-planner" className="zen-serif text-lg text-[var(--zen-saffron-400)] hover:opacity-70 transition">
            Plan a ritual &rarr; find auspicious dates
          </a>
        </div>
      </div>
    </main>
  );
}
