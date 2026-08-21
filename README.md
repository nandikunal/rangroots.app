# rangroots.app

Frontend for **Rang Roots** — Hindu calendar/muhurta + Indian community events portal for Indians in Europe.

Consumes the two backend services in [`rangroots.api`](https://github.com/nandikunal/rangroots.api):
- Calendar & Muhurta API
- Events API (discovery, submission, admin moderation)

## Stack

Two frontends, one repo, one shared API contract:

- **`mobile/`** — Flutter app (iOS/Android)
- **`web/`** — Next.js website (React, TypeScript)

Rationale: the website needs strong SEO and fast first paint (e.g. someone searching "Diwali Berlin 2026" should land directly on the relevant event page), which favors Next.js over Flutter Web. Mobile favors Flutter for native performance and code reuse with the existing RSS aggregator app. Both consume the identical REST endpoints exposed by `rangroots.api`, so filtering/category/status logic stays consistent across platforms even though the UI code isn't shared.

## Core screens (MVP) — same on both platforms

1. **Home** — two primary actions ("Hindu calendar & muhurta", "Indian events in your city"), city selector, today's highlights.
2. **Calendar** — daily panchang summary + key muhurta bands, "More details" toggle for advanced panchang info.
3. **Events** — city picker, date filter, category chips, free/paid toggle, event card list.
4. **Event detail** — full description, organizer info, booking link, Interested/Going buttons.
5. **Submission form** (registered users) — minimal required fields, optional advanced section collapsed by default.
6. **Admin console** — pending submissions, review/approve/reject, taxonomy management. (Likely web-only initially.)

## Design principles

- Progressive disclosure: show essentials first, advanced info behind toggles.
- Mobile-first, fully responsive — applies to both the Flutter app and the Next.js site.
- English first; structure all strings behind translation keys (Flutter: `intl`; Next.js: `next-intl` or `next-i18next`) for German (and later Indian languages) from day one.
- SEO on web: server-rendered event/calendar pages with proper meta tags, since discoverability (e.g. "Indian events Berlin this weekend") is a primary acquisition channel for the events hub.

## Repository layout

```
rangroots.app/
├── mobile/                 # Flutter app
│   ├── lib/
│   │   ├── screens/
│   │   │   ├── home_screen.dart
│   │   │   ├── calendar_screen.dart
│   │   │   ├── events_screen.dart
│   │   │   ├── event_detail_screen.dart
│   │   │   └── submit_event_screen.dart
│   │   ├── models/
│   │   ├── services/       # API clients for calendar + events services
│   │   └── main.dart
│   └── pubspec.yaml
├── web/                    # Next.js website
│   ├── app/
│   │   ├── page.tsx                    # Home
│   │   ├── calendar/page.tsx           # Calendar & Muhurta
│   │   ├── events/page.tsx             # Events listing
│   │   ├── events/[id]/page.tsx        # Event detail
│   │   └── submit/page.tsx             # Event submission form
│   ├── lib/
│   │   └── api.ts          # API clients for calendar + events services
│   ├── package.json
│   └── next.config.js
└── README.md
```

## Getting started

### Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

### Web (Next.js)

```bash
cd web
npm install
npm run dev
```

## License

TBD — to be decided before public release. Internal development for now.
