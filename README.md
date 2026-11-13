# CaseDiary

A hearing date tracker for Indian lawyers, built for solo and district-court
advocates. The app answers one question: **"What is listed where tomorrow?"**

Built for **Rampur District Court** as the first target market.

---

## Status

**Current version:** `v0.7.1` — complete UI overhaul with Bottom Tab Navigation, custom date pickers, and professional UX polish.

| Feature | Status |
|---|---|
| Case list sorted by next hearing date | ✅ |
| Add/Edit/Delete cases with custom date picker | ✅ |
| "Overdue" and "Urgent" visual warnings | ✅ |
| Local persistence (SQLite, no internet needed) | ✅ |
| Per-case notes | ✅ |
| Day-before + morning-of reminders | ✅ |
| Nyaykosh Legal Reference (offline cached) | ✅ |
| Limitation Period Calculator | ✅ |
| Bottom Tab Navigation (Cases, Calculator, Laws) | ✅ |
| Publish to stores | ⏳ pending validation |

See [`TODO.md`](TODO.md) for deferred items and verification tasks.

---

## Tech stack

- **React Native** with **Expo** (managed workflow) — SDK 58
- **TypeScript**
- **React Navigation** (Bottom Tabs)
- **expo-sqlite** — local database, works offline
- **expo-notifications** — local scheduled reminders, no server
- **@react-native-community/datetimepicker** — custom floating date picker
- **@react-native-async-storage/async-storage** — caching API responses
- **Git + GitHub** — version control

Zero backend. Zero API costs. Data stays on the phone.

---

## Running locally

Requires: Node.js (LTS), Git, VS Code, and an iPhone or Android device with
**Expo Go** installed.

```bash
git clone https://github.com/blackboa-ai/mobile-app-project-T1.git
cd mobile-app-project-T1
npx expo start

Scan the QR code with Expo Go on your phone (same Wi-Fi network as your
computer). The app loads immediately — no build step needed for development.

iOS note: Expo Go on iPhone requires the phone and the computer to be
signed into the same Expo account (blackboa). If the app doesn't connect,
run npx expo login on the computer.

Project structure

mobile-app-project-T1/
├── App.tsx                    # App entry: cases, modals, screens
├── src/
│   ├── storage/
│   │   └── cases.ts           # SQLite: schema, migrations, CRUD
│   ├── notifications.ts       # Local reminder scheduling
│   ├── nyaykosh.ts            # Free govt API (laws & provisions) + cache
│   └── limitation.ts          # Limitation period calculation logic
├── assets/                    # App icons, splash
├── app.json                   # Expo config
├── package.json
├── TODO.md                    # Deferred / pending verification
└── README.md                  # this file

Version history
Version	Tag	Description
v0.0.1	v0.0.1	Expo scaffold
v0.2.2	v0.2.2	SQLite persistence, list from DB, add case modal
v0.3.0	v0.3.0	Edit and delete cases
v0.4.0	v0.4.0	Local notifications (day-before + morning-of)
v0.4.1	v0.4.1	Per-case notes
v0.5.0	v0.5.0	Nyaykosh legal reference with offline caching
v0.6.0	v0.6.0	Limitation Period Calculator
v0.7.0	v0.7.0	Bottom Tab Navigation and Safe Area fixes
v0.7.1	v0.7.1	Custom date picker, overdue warnings, placeholder fixes

Commit messages follow Conventional Commits.

Known limitations (development)
SafeAreaView from react-native is deprecated; will be replaced in a
polish phase with react-native-safe-area-context.

expo-notifications is not fully supported in Expo Go on iOS (SDK 53+).
Scheduling works, but real delivery must be verified in a development
build. See TODO.md.

The Nyaykosh API currently only covers 4 Acts (DPDP, Aadhaar, IT Act, Gaming).

The current data model is manual entry only. There is no eCourts
auto-fetch, and this is intentional.

Design philosophy: trust over automation
Indian lawyers distrust scraped court data because stale or wrong dates have
cost clients their cases. CaseDiary treats the lawyer's own entry as the
source of truth. When we eventually add eCourts fetching, every date will
be labelled as either "You entered this" or "Fetched / unverified" so the
lawyer always knows what they're looking at.

Roadmap
Phase 7 — UI Polish (Bottom Navigation Tabs, empty states, safe-area fix).

Phase 8 — Development build (EAS) to verify real notifications, then
Google Play internal testing track ($25 one-time).

Later — eCourts cause list integration (trust mode labels), daily digest.

License
Not yet chosen. All rights reserved by the author.