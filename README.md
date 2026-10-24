# MiniLedger

**Track the money you lend to friends — and get it back on time.**

MiniLedger is a small full-stack app: an **Expo (React Native + TypeScript)** mobile client and a
**Node/Express/TypeScript + PostgreSQL** REST API. You sign in with a phone number and a mock OTP,
record every loan you give out, and get an at-a-glance view of what is still pending and what is
overdue.

| | |
|---|---|
| **Mobile app** | `apps/mobile` — Expo SDK 58, React Native 0.88, React 19, React Navigation 7, SecureStore, Expo ImagePicker |
| **API** | `apps/api` — Express 5, TypeScript (ESM), `pg`, `zod`, JWT, helmet, rate limiting |
| **Database** | PostgreSQL 16 (Docker Compose) with versioned SQL migrations |
| **Tests** | 159 automated tests (105 API + 54 mobile) — unit + integration, with the API integration suite run against a real PostgreSQL |

---

## Table of contents

1. [Features](#features)
2. [Repository layout](#repository-layout)
3. [Prerequisites](#prerequisites)
4. [Quick start](#quick-start)
5. [Running the mobile app](#running-the-mobile-app)
6. [The mock OTP](#the-mock-otp)
7. [API reference](#api-reference)
8. [Data model & migrations](#data-model--migrations)
9. [Business rules](#business-rules)
10. [Testing](#testing)
11. [Demo script](#demo-script-2-3-minutes)
12. [Configuration](#configuration)
13. [Limitations & next steps](#limitations--next-steps)
14. [Troubleshooting](#troubleshooting)

---

## Features

**Mobile app**

- Phone-number sign-in with a country picker and immediate client-side validation.
- Segmented 6-digit OTP entry with live expiry and resend countdowns.
- Dashboard: total lent, repaid, overdue and pending — plus the three most recent loans.
- Loan list with pull-to-refresh, overdue badges and a "mark as repaid" confirmation.
- Add a loan: name, amount, due date (native date picker) and an optional receipt photo.
- Settings: signed-in identity, ledger snapshot, API base URL, sign out.
- Session persisted in the OS keystore (`expo-secure-store`); an expired/invalid token returns the
  user to the sign-in screen automatically.
- Accessibility-minded UI: 48 px touch targets, labels on every control, and status badges that
  carry a **glyph plus wording** (never colour alone).

**API**

- Mock phone OTP (6 digits, hashed with scrypt, single use, 5-minute expiry, attempt limited).
- JWT bearer authentication; every loan is scoped to the token's user.
- Loans CRUD, an aggregated summary endpoint, repayment, and optional receipt image upload/download.
- Exact decimal money handling end to end — `NUMERIC(14,2)` in PostgreSQL, integer paise
  arithmetic in the service layer, exact decimal strings over the wire.
- Explicit request validation (`zod`), typed error envelope, structured logging, rate limiting,
  security headers and a health probe.

---

## Repository layout

```
.
├── apps
│   ├── api                     Express + TypeScript API
│   │   ├── migrations/         001_users, 002_otp_verifications, 003_loans
│   │   ├── src
│   │   │   ├── config/         typed environment loading
│   │   │   ├── db/             pg pool + migration runner
│   │   │   ├── errors/         AppError (code / message / details)
│   │   │   ├── middleware/     auth, error handler, rate limits, zod validation
│   │   │   ├── modules/        auth, loans, health
│   │   │   └── utils/          money, dates, phone, otp, jwt, clock, logger, http
│   │   └── tests/              unit + integration (Vitest + Supertest)
│   └── mobile                  Expo React Native app
│       └── src
│           ├── api/            typed HTTP client + endpoint wrappers
│           ├── auth/           AuthContext + SecureStore session
│           ├── components/     design-system components
│           ├── ledger/         LedgerContext (loans + summary state)
│           ├── navigation/     RootNavigator + route types
│           ├── screens/        Login, Otp, Dashboard, Loans, AddLoan, Settings
│           ├── theme/          colours, spacing, typography
│           ├── types/          API types
│           └── utils/          formatting + validation
├── docker
│   └── postgres/init/          creates the dedicated test database
├── docker-compose.yml          PostgreSQL 16 service
├── scripts/smoke.ps1           end-to-end check against a running API
└── package.json                convenience scripts for both apps
```

The two apps are **not** npm workspaces — the root `package.json` delegates with
`npm --prefix apps/<app> …`. This keeps Metro's module resolution predictable.

---

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | v24.11.0 | `>= 20.19` required |
| npm | 11.6.1 | ships with Node |
| Docker Desktop | 29.7.2 | for PostgreSQL 16 |
| Expo Go / dev client | latest | Android emulator, iOS simulator or a physical phone |

---

## Quick start

```bash
# 1. install dependencies
npm run install:all

# 2. start PostgreSQL (container "miniledger-postgres", port 5432)
npm run db:up

# 3. create the .env files
copy apps\api\.env.example apps\api\.env      # Windows
cp apps/api/.env.example apps/api/.env        # macOS / Linux
#    → it already points at the docker-compose database, so no edit is needed

# 4. apply the migrations
npm run api:migrate

# 5. start the API (http://localhost:4000)
npm run api:dev

# 6. in a second terminal, start the app
npm run mobile:start
```

Then press `a` for an Android emulator, `i` for an iOS simulator, or scan the QR code with
**Expo Go** on a physical phone.

Sanity check the API:

```bash
curl http://localhost:4000/api/health
# {"success":true,"data":{"status":"ok","database":"up",...}}
```

---

## Running the mobile app

The app needs to know where the API is. That URL comes from `EXPO_PUBLIC_API_URL`
(read at build time by Metro):

```bash
# apps/mobile/.env  (copy from apps/mobile/.env.example)
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

| Where the app runs | URL to use |
|---|---|
| Android emulator (AVD) | `http://10.0.2.2:4000` — the emulator reaches the host through this alias |
| iOS simulator | `http://localhost:4000` |
| Physical phone (Expo Go) | `http://<your-LAN-IP>:4000`, e.g. `http://192.168.1.20:4000` |

For a physical phone both devices must be on the same network, and the API must listen on
`0.0.0.0` (it does by default — `HOST=0.0.0.0` in `apps/api/.env`).

Find your LAN IP:

```bash
# Windows
ipconfig | findstr IPv4
```

The current base URL is also shown on the app's **Settings** screen, which makes it easy to
confirm what the app is actually calling.

> **Cleartext HTTP:** the development API is plain HTTP. On Android this is fine for a debug
> build; a release build targeting API 28+ would need `usesCleartextTraffic` or an HTTPS tunnel.

---

## The mock OTP

There is no SMS provider. Requesting a code generates one on the server and **prints it to the
API terminal only** — it is never part of an HTTP response:

```
[MOCK OTP] phone=+919876543210 code=482913 expiresIn=5m attempts=5
```

Open the terminal running `npm run api:dev` and copy the code into the app (or into curl).
The code:

- expires after 5 minutes,
- allows 5 attempts,
- can be used exactly once,
- is replaced when a new code is requested,
- and a new code can only be requested every 30 seconds.

The `[MOCK OTP]` line is written straight to stdout, so it is **not** filtered by `LOG_LEVEL` —
lowering logging to `warn` or `silent` can never hide a code you need to sign in. OTP logging is
**on by default outside production**; set `OTP_LOG_ENABLED=false` to turn it off (useful in CI),
or set it explicitly to `true` if you really want codes in a production log.

---

## API reference

Base URL `http://localhost:4000/api`.

**Envelope**

```jsonc
// success
{ "success": true, "data": { /* payload */ } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { } } }
```

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | – | Liveness probe; `503` when the database is unreachable |
| `POST` | `/api/auth/request-otp` | – | Create a mock OTP (rate limited per phone and per IP) |
| `POST` | `/api/auth/verify-otp` | – | Exchange a valid OTP for a JWT |
| `GET` | `/api/loans` | Bearer | List the loans of the signed-in user |
| `GET` | `/api/loans/summary` | Bearer | Aggregated totals and counts |
| `POST` | `/api/loans` | Bearer | Create a loan (`201`) |
| `PATCH` | `/api/loans/:id/repay` | Bearer | Mark a loan as repaid |
| `POST` | `/api/loans/:id/receipt` | Bearer | Attach a receipt image (multipart) |
| `GET` | `/api/loans/:id/receipt` | Bearer | Download the receipt image |

### Examples

```bash
# 1. request a code
curl -s -X POST http://localhost:4000/api/auth/request-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9876543210","countryCode":"IN"}'

# 2. verify it (use the code printed in the API terminal)
curl -s -X POST http://localhost:4000/api/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9876543210","code":"482913","countryCode":"IN"}'

# 3. create a loan
curl -s -X POST http://localhost:4000/api/loans \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <token>' \
  -d '{"friendName":"Rahul","amount":"1500.50","dueDate":"2026-12-01"}'

# 4. read the summary
curl -s http://localhost:4000/api/loans/summary -H 'Authorization: Bearer <token>'

# 5. mark it as repaid
curl -s -X PATCH http://localhost:4000/api/loans/<loanId>/repay \
  -H 'Authorization: Bearer <token>'
```

### Response shapes

```jsonc
// POST /api/auth/request-otp
{ "success": true, "data": {
  "phone": "+919876543210",
  "expiresInSeconds": 300,
  "resendAvailableInSeconds": 30,
  "message": "A verification code has been sent. Check the API terminal for the mock code."
} }

// POST /api/auth/verify-otp
{ "success": true, "data": {
  "token": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 604800,
  "user": { "id": "<uuid>", "phone": "+919876543210", "createdAt": "2026-10-24T10:00:00.000Z" }
} }

// GET /api/loans          (overdue pending first, then by due date)
{ "success": true, "data": { "loans": [ /* Loan */ ], "count": 1 } }

// Loan
{ "id": "<uuid>", "friendName": "Rahul", "amount": "1500.50", "dueDate": "2026-12-01",
  "status": "pending", "isOverdue": false, "daysOverdue": 0, "receiptPath": null,
  "repaidAt": null, "createdAt": "…", "updatedAt": "…" }

// GET /api/loans/summary
{ "success": true, "data": {
  "totalLent": "1500.50", "totalRepaid": "0.00", "overdueAmount": "0.00",
  "pendingAmount": "1500.50", "loanCount": 1, "pendingCount": 1,
  "repaidCount": 0, "overdueCount": 0
} }

// POST /api/loans (201), PATCH /api/loans/:id/repay, POST /api/loans/:id/receipt
{ "success": true, "data": { "loan": { /* Loan */ } } }
```

`isOverdue` and `daysOverdue` are computed with the server's `APP_TIMEZONE`, not the device clock.

### Error codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | The request body or an identifier failed validation (`details` lists the fields) |
| `INVALID_JSON` | 400 | The request body is not valid JSON |
| `OTP_INVALID` | 400 | Wrong or unknown code |
| `OTP_EXPIRED` | 400 | The code is older than `OTP_EXPIRY_MINUTES` |
| `OTP_USED` | 400 | The code was already consumed |
| `RATE_LIMITED` | 429 | OTP cooldown, too many requests, or too many wrong attempts |
| `TOKEN_MISSING` | 401 | No bearer token was supplied |
| `TOKEN_INVALID` | 401 | The token is malformed or was signed with another secret |
| `TOKEN_EXPIRED` | 401 | The token is past `JWT_EXPIRES_IN_SECONDS` |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `LOAN_NOT_FOUND` | 404 | No such loan **for this user** |
| `LOAN_ALREADY_REPAID` | 409 | The loan is already settled |
| `RECEIPT_REQUIRED` | 400 | No image was sent in the `receipt` field |
| `UNSUPPORTED_FILE_TYPE` | 400 | Receipt is not JPEG, PNG, WEBP or HEIC |
| `INVALID_RECEIPT_PATH` | 400 | A stored receipt path escaped the upload directory |
| `RECEIPT_NOT_FOUND` / `RECEIPT_FILE_MISSING` | 404 | The loan has no receipt, or its file is gone |
| `PAYLOAD_TOO_LARGE` | 413 | Request body exceeded the 1 MB JSON limit |
| `ROUTE_NOT_FOUND` | 404 | No route matches the method and path |
| `INTERNAL_ERROR` | 500 | Unexpected failure (details are hidden in production) |

---

## Data model & migrations

Migrations are plain SQL files in `apps/api/migrations`, applied in filename order and recorded in
a `schema_migrations` table. They are idempotent — re-running is a no-op.

```bash
npm run api:migrate            # apply pending migrations
npm --prefix apps/api run migrate:status   # show what is applied
```

| Table | Purpose |
|---|---|
| `users` | One row per phone number (`phone` is unique and stored canonically as `+<dial><national>`) |
| `otp_verifications` | Hashed codes, expiry, attempts, consumption state |
| `loans` | `friend_name`, `amount NUMERIC(14,2)`, `due_date DATE`, `status`, `receipt_path`, timestamps |

Loans are indexed on `(user_id, created_at)` and on `(user_id, status, due_date)` — the second one
backs the summary and overdue queries.

---

## Business rules

**Money**

- Amounts are validated and normalised to an exact decimal string (`"1500.5"` → `"1500.50"`).
- At most two decimal places; strictly positive; stored as `NUMERIC(14,2)`.
- Aggregation happens with `SUM()` in PostgreSQL; wherever the application does arithmetic it uses
  integer paise, so JavaScript floats are never used for money.

**Overdue**

- A loan is overdue when `status = 'pending'` **and** `due_date < today`.
- A loan due **today** is *not* overdue; it becomes overdue from the next day.
- "Today" is resolved in `APP_TIMEZONE` (default `Asia/Kolkata`) and passed explicitly into the
  SQL, so a mismatch between the app clock and the database clock can never flip the result.

**Ownership**

- The user id always comes from the JWT; a client-supplied `userId` is ignored.
- Another user's loan is invisible: `404 LOAN_NOT_FOUND` rather than `403`, so the API never
  confirms that a loan exists.
- Repaying an already repaid loan returns `409 LOAN_ALREADY_REPAID`.

**Summary**

`GET /api/loans/summary` returns `totalLent`, `totalRepaid`, `overdueAmount`, `pendingAmount`,
`loanCount`, `pendingCount`, `repaidCount` and `overdueCount` for the signed-in user only.

---

## Testing

```bash
npm test                      # API + mobile
npm run api:test              # 105 API tests
npm run api:test:unit         # 52 unit tests (no database needed)
npm run api:test:integration  # 53 integration tests (real PostgreSQL)
npm run mobile:test           # 54 mobile unit tests
npm run typecheck             # both apps
npm run lint                  # both apps
```

The integration suite runs against the dedicated `miniledger_test` database (created automatically
by the Docker init script) and **fails loudly** if `DATABASE_URL_TEST` is missing — it never
silently touches your development data.

What is covered:

| Area | Highlights |
|---|---|
| Money | Decimal parsing, zero handling, paise arithmetic, overflow guards |
| Dates | Overdue boundaries, "due today is not overdue", timezone handling |
| Phone | Normalisation to E.164-like form, dial-code disambiguation, invalid input |
| OTP | Hashing, expiry, attempt limits, single use, cooldown, reuse detection, log visibility and suppression |
| Auth API | Request/verify flows, invalid code, expired code, rate limiting, token rejection |
| Loans API | Create/list/summary/repay, validation errors, cross-user isolation, 404/409 paths |
| Mobile format | Indian digit grouping, exact currency rendering, date wording, phone display |
| Mobile validation | Phone rules per country, amount normalisation, OTP, friend name |
| Mobile client | Envelope unwrapping, error mapping, 401 handling, network failures, base URL |

There is also an end-to-end smoke test against a **running** API:

```bash
# terminal 1 - the script reads the code from this log file
npm run api:dev *> apps/api/dev-server.log
# terminal 2
powershell -ExecutionPolicy Bypass -File scripts\smoke.ps1
```

The script tails `apps/api/dev-server.log` to pick up the `[MOCK OTP]` line, so start the API with
its output redirected there (as above). It also waits ~31 seconds for the OTP resend cooldown before
creating a second user, so a full run takes about a minute.

It walks through health → request OTP → read the code from the log → verify → reuse rejection →
empty summary → invalid amount → create → list → summary → repay → double-repay → cross-user
isolation → invalid token, and prints the status code for every rejection.

---

## Demo script (2–3 minutes)

1. **Terminal**: `npm run db:up`, `npm run api:migrate`, `npm run api:dev`.
   Point out the startup banner and the `[MOCK OTP] …` line format.
2. **App**: open Expo Go → enter `9876543210` → tap **Send verification code**.
3. **Terminal**: read the printed code → type it into the app → **Verify and continue**.
4. **Dashboard**: empty state → tap **Add a loan** → "Rahul", `1500.50`, due date in two days →
   **Save loan**.
5. **Add** a second loan for "Priya" with a due date **yesterday** → the loan card shows
   **Overdue by 1 day** (glyph + wording, not just red).
6. **Loans** tab → pull to refresh → **Mark as repaid** on Rahul's loan → the summary updates:
   Rahul moves from pending to repaid (`₹1,500.50`), while Priya stays pending and overdue.
7. **Add** tab → attach a receipt photo while adding a loan → the loan card shows the
   *Receipt attached* badge.
8. **Settings** → show the API base URL and the ledger snapshot → **Sign out** → sign in again,
   then close and reopen the app to show the session is restored from the keystore.
9. Optional: `npm test` to show the 159 automated tests passing.

---

## Configuration

### `apps/api/.env` (see `apps/api/.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `4000` / `0.0.0.0` | Where the API listens |
| `DATABASE_URL` | docker-compose DB | Application database |
| `DATABASE_URL_TEST` | `…/miniledger_test` | Integration test database |
| `JWT_SECRET` | — | **Change this** outside development |
| `JWT_EXPIRES_IN_SECONDS` | `604800` | Access token lifetime (7 days) |
| `OTP_EXPIRY_MINUTES` | `5` | Code lifetime |
| `OTP_MAX_ATTEMPTS` | `5` | Attempts per code |
| `OTP_RESEND_COOLDOWN_SECONDS` | `30` | Delay before a new code can be requested |
| `OTP_LOG_ENABLED` | `true` outside production | Print mock codes to the terminal (off when `NODE_ENV=production` unless set to `true`); bypasses `LOG_LEVEL` |
| `OTP_RATE_LIMIT_PER_PHONE` / `_PER_IP` | `5` / `30` | OTP rate limits per window |
| `OTP_RATE_LIMIT_WINDOW_MS` | `600000` | Rate-limit window (10 minutes) |
| `APP_TIMEZONE` | `Asia/Kolkata` | Calendar timezone used for "today" |
| `CORS_ORIGINS` | `*` | Allowed origins (`*` in development) |
| `UPLOAD_DIR` / `MAX_UPLOAD_BYTES` | `uploads` / `5242880` | Receipt storage |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` \| `silent` |

### `apps/mobile/.env` (see `apps/mobile/.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://10.0.2.2:4000` | Base URL of the API |

---

## Limitations & next steps

Honest list of what is not production-ready:

- **The OTP is a mock.** Codes are printed to the server log; there is no SMS/WhatsApp provider, no
  phone verification and no fraud protection. A real deployment needs a provider plus a
  cost/attempts strategy.
- **No refresh tokens.** The JWT lives for seven days; there is no silent renewal, so an expired
  token means signing in again.
- **Receipts are stored on the API's local disk** and served back through the API — no object
  storage, no image resizing, and an upload that fails after the file is written can be left behind.
- **No pagination.** `GET /api/loans` returns every loan of the user; fine for a personal ledger,
  not for thousands of rows.
- **No push notifications.** Overdue state is computed on read; nothing tells you that a loan
  became overdue while the app was closed.
- **Not yet run on a device in this environment** — the code type-checks, lints and unit-tests
  clean, but the UI has not been exercised on a simulator or a physical phone yet.
- **Single-language, single-currency.** The formatting is INR with Indian digit grouping.

Natural next steps: real SMS OTP + refresh tokens, object storage for receipts, pagination and
filtering on the loans endpoint, due-date reminders, and an end-to-end UI test layer.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot reach PostgreSQL` on start | `npm run db:up`, then `npm run api:migrate` |
| `miniledger_test` does not exist | The init script only runs on a fresh volume — `npm run db:reset` then `npm run db:up` |
| Integration tests fail with a DB error | `DATABASE_URL_TEST` must point at `miniledger_test` in `apps/api/.env` |
| App shows "Cannot reach the MiniLedger server" | Wrong `EXPO_PUBLIC_API_URL` — use `10.0.2.2` on an Android emulator, `localhost` on an iOS simulator, or your LAN IP on a phone |
| App cannot load the code | Read it from the API terminal (`[MOCK OTP] …`); restart the API to see fresh lines |
| No `[MOCK OTP]` line appears | Watch the terminal that actually started the API. If an older instance still owns port 4000, requests go to that process instead — stop every `node`/`tsx` API process, then start one `npm run api:dev`. The code is printed regardless of `LOG_LEVEL`, but only when `OTP_LOG_ENABLED=true` |
| "The code has expired" | Codes live 5 minutes — request a new one |
| Port 4000 already in use | Change `PORT` in `apps/api/.env` (and the mobile base URL) |
| Expo bundler fails after a dependency change | `npx expo start --clear` |
