# CaseDiary

A hearing date tracker for Indian lawyers, built for solo and district-court
advocates. The app answers one question: **"What is listed where tomorrow?"**

Built for **Rampur District Court** as the first target market.

---

## Status

**Current version:** `v0.4.1` — working MVP, tested on iPhone via Expo Go.

| Feature | Status |
|---|---|
| Case list sorted by next hearing date | ✅ |
| Add case with date picker | ✅ |
| Edit case (tap a card) | ✅ |
| Delete case with confirmation | ✅ |
| Local persistence (SQLite, no internet needed) | ✅ |
| Per-case notes | ✅ |
| Day-before + morning-of reminders | ✅ |
| Publish to stores | ⏳ pending validation |

See [`TODO.md`](TODO.md) for deferred items and verification tasks.

---

## Tech stack

- **React Native** with **Expo** (managed workflow) — SDK 58
- **TypeScript**
- **expo-sqlite** — local database, works offline
- **expo-notifications** — local scheduled reminders, no server
- **@react-native-community/datetimepicker** — date field
- **Git + GitHub** — version control

Zero backend. Zero API costs. Data stays on the phone.

---

## Running locally

Requires: Node.js (LTS), Git, VS Code, and an iPhone or Android device with
**Expo Go** installed (free from the App Store / Play Store).

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
text
mobile-app-project-T1/
├── App.tsx                    # App entry: list, modal, form
├── src/
│   ├── storage/
│   │   └── cases.ts           # SQLite: schema, migrations, CRUD
│   └── notifications.ts       # Local reminder scheduling
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
Commit messages follow Conventional Commits.

Known limitations (development)
SafeAreaView from react-native is deprecated; will be replaced in a
polish phase with react-native-safe-area-context.

expo-notifications is not fully supported in Expo Go on iOS (SDK 53+).
Scheduling works, but real delivery must be verified in a development
build. See TODO.md.

The current data model is manual entry only. There is no eCourts
auto-fetch, and this is intentional — see the trust-model note below.

Design philosophy: trust over automation
Indian lawyers distrust scraped court data because stale or wrong dates have
cost clients their cases. CaseDiary treats the lawyer's own entry as the
source of truth. When we eventually add eCourts fetching, every date will
be labelled as either "You entered this" or "Fetched / unverified" so the
lawyer always knows what they're looking at.

The app is deliberately narrow: it does not do billing, AI drafting,
document management, client portals, or team workflows. It does one thing —
help the lawyer never miss a hearing.

Roadmap
Phase 5 — polish: safe-area fix, empty-state improvement, card design.

Phase 6 — development build (EAS) to verify real notifications, then
Google Play internal testing track ($25 one-time).

Later — trust-mode labels, daily digest, procedural deadline tracker.

License
Not yet chosen. All rights reserved by the author.