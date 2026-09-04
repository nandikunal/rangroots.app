"use client";
import { useEffect, useMemo, useState } from "react";
import {
  getDailyPanchang,
  getFestivals,
  listEvents,
  DailyPanchang,
  FestivalEntry,
  EventSummary,
  CITIES,
} from "@/lib/api";

// Unified Calendar + Events page.
// Layout inspired by hinduamerican.org's holidays guide: a date-forward
// "today" anchor, festivals grouped into category sections, today's date
// visually highlighted in the list. City events are woven in as their own
// section beneath the festival calendar, using the same city context.

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_META: Record<FestivalEntry["category"], { label: string; color: string; emoji: string }> = {
  festival: { label: "Festivals", color: "border-orange-300 bg-orange-50", emoji: "\u{1F3EE}" },
  deity: { label: "Celebrating Deities", color: "border-purple-300 bg-purple-50", emoji: "\u{1F6D5}" },
  observance: { label: "Observances", color: "border-blue-300 bg-blue-50", emoji: "\u{1F4FF}" },
  other: { label: "Other", color: "border-gray-300 bg-gray-50", emoji: "\u2728" },
};

export default function CalendarPage() {
  const [cityId, setCityId] = useState("berlin");
  const [date] = useState(todayISO());
  const [panchang, setPanchang] = useState<DailyPanchang | null>(null);
  const [festivals, setFestivals] = useState<FestivalEntry[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const grouped = useMemo(() => {
    const g: Record<string, FestivalEntry[]> = {};
    for (const f of festivals) {
      (g[f.category] ??= []).push(f);
    }
    Object.values(g).forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)));
    return g;
  }, [festivals]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-orange-900 text-center mb-1">
          Calendar & Events
        </h1>
        <p className="text-center text-orange-700/80 mb-6">
          Today&apos;s panchang, upcoming festivals, and Indian events near you
        </p>

        <div className="flex justify-center mb-8">
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="rounded-xl border border-orange-200 bg-white px-4 py-3 text-orange-900 font-medium shadow-sm focus:ring-2 focus:ring-orange-400 outline-none"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {loading && <div className="animate-pulse rounded-2xl bg-orange-100 h-56 mb-8" />}

        {/* Today hero */}
        {panchang && !loading && (
          <div className="rounded-2xl bg-white shadow-md border border-orange-100 overflow-hidden mb-10">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white">
              <div className="text-sm opacity-90">
                {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <div className="text-2xl font-bold">{panchang.tithi} &middot; {panchang.paksha} Paksha</div>
              {panchang.festivals?.length > 0 && (
                <div className="mt-2 inline-block bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
                  Today: {panchang.festivals.join(", ")}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              <InfoTile label="Sunrise" value={panchang.sunrise} emoji="\u{1F305}" />
              <InfoTile label="Sunset" value={panchang.sunset} emoji="\u{1F307}" />
            </div>
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="w-full text-center py-3 text-orange-700 font-medium border-t border-orange-100 hover:bg-orange-50 transition"
            >
              {showDetails ? "Hide details \u25B2" : "More details \u25BC"}
            </button>
            {showDetails && (
              <div className="px-6 pb-6 space-y-2 text-sm text-gray-700 border-t border-orange-50">
                <DetailRow label="Nakshatra" value={panchang.nakshatra} />
                <DetailRow label="Yoga" value={panchang.yoga} />
                <DetailRow label="Karana" value={panchang.karana} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700 text-center mb-10">
            {error}
          </div>
        )}

        {/* Festival calendar, grouped by category, today highlighted */}
        <h2 className="text-xl font-bold text-orange-900 mb-4">{year} Festival Calendar</h2>
        <div className="space-y-8 mb-12">
          {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat) => {
            const list = grouped[cat];
            if (!list || list.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <section key={cat}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>{meta.emoji}</span> {meta.label}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {list.map((f) => {
                    const isToday = f.date === date;
                    return (
                      <div
                        key={f.name + f.date}
                        className={`rounded-xl border p-4 ${meta.color} ${
                          isToday ? "ring-2 ring-orange-500 shadow-md" : ""
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-500">
                          {new Date(f.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {isToday && <span className="ml-2 text-orange-600">&bull; TODAY</span>}
                        </div>
                        <div className="font-medium text-gray-900 mt-1">{f.name}</div>
                        {f.description && <div className="text-sm text-gray-600 mt-1">{f.description}</div>}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {festivals.length === 0 && !loading && (
            <p className="text-gray-500 text-sm">Festival data isn&apos;t available yet for this city/year.</p>
          )}
        </div>

        {/* City events */}
        <h2 className="text-xl font-bold text-orange-900 mb-4">Indian Events in {CITIES.find((c) => c.id === cityId)?.label}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {events.map((e) => (
            <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">
                {new Date(e.start_datetime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {e.venue_name && <> &middot; {e.venue_name}</>}
              </div>
              <div className="font-medium text-gray-900 mt-1">{e.title}</div>
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{e.description}</div>
              <div className="mt-2 flex gap-2">
                <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">{e.event_category}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 ${e.is_free ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                  {e.is_free ? "Free" : "Paid"}
                </span>
              </div>
            </div>
          ))}
          {events.length === 0 && !loading && (
            <p className="text-gray-500 text-sm col-span-2">No upcoming events found for this city yet.</p>
          )}
        </div>

        <div className="mt-8 text-center">
          <a href="/calendar/ritual-planner" className="text-orange-700 underline font-medium">
            Plan a ritual &rarr; find auspicious dates
          </a>
        </div>
      </div>
    </main>
  );
}

function InfoTile({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
      <div className="text-xs text-gray-500 flex items-center gap-1">{emoji} {label}</div>
      <div className="font-semibold text-gray-800 mt-1">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-orange-50 py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
