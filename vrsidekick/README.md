# VR Sidekick

**Vacation Rental Sidekick** is a two-sided marketplace (think TaskRabbit, built for short-term rentals).
**Hosts** find and book local **Sidekicks**, individual or company service providers, for turnovers, laundry,
lawn and pool care, repairs, guest check-ins and more.

```
vrsidekick/
├── web/      Next.js 15 web app + REST API (Postgres via Prisma, Stripe Connect)
└── mobile/   Expo / React Native app (iOS + Android) using the same REST API
```

## Features

| Area | What's included |
| --- | --- |
| **Sidekick profiles** | Individual or company. Bio, experience, insured flag. Tasks offered with an **hourly or flat rate** each. Skills and tools/equipment. |
| **Service area** | Home-base ZIP + travel radius (geocoded), plus an explicit list of extra ZIP codes. |
| **Availability** | Standard weekly schedule in the Sidekick's timezone. One-off **blocks** (travel, time off) and one-off **extra windows**. Booked jobs plus a configurable travel buffer are removed automatically. |
| **Search** | Hosts filter by rental ZIP (radius or ZIP-list match), task type, skill, tool or keyword. Results are sorted by distance. |
| **Booking** | Hosts request a time from the Sidekick's live open windows. Overlapping requests are rejected server-side. Sidekick accepts or declines. |
| **Recurring jobs** | Weekly, every two weeks or monthly, with an optional end date. Once accepted, visits are auto-scheduled up to an admin-set horizon, and a daily cron extends them. Clashes are skipped and flagged in chat. |
| **Chat** | One thread per Host–Sidekick pair. Job events (requested, accepted, completed…) are posted automatically. |
| **Sidekick Wanted ads** | Hosts post ads. Sidekicks browse ads in their service area and reply, which opens a chat. |
| **Calendars** | Month calendar (web) and agenda (mobile) for both personas. Sidekicks also see open and blocked time. |
| **Payments** | Stripe: hosts save a card (Checkout, setup mode). Sidekicks onboard with **Stripe Connect Express**. When a job is completed the host is charged off-session as a **destination charge**: the Sidekick receives their price and the platform keeps the **service fee** as the application fee. |
| **Reviews** | Hosts rate completed jobs. Sidekick rating is aggregated. |
| **Admin** | Users (suspend/reactivate, change role, hide from search, delete). Task types, skills and tools (add, rename, deactivate, delete). **Separate service fees for one-time vs. recurring jobs**, plus a minimum fee and the recurring horizon. All jobs, ad moderation and revenue stats. |

### How the service fee works
`host total = Sidekick price + max(minimum fee, price × fee %)`. The percentage is the admin's *one-time* or
*recurring* rate, locked in when the job is requested. Hourly jobs are re-priced from the hours the
Sidekick reports at completion.

## Running locally

Requires Node 20+ and PostgreSQL.

```bash
cd vrsidekick/web
cp .env.example .env          # set DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate deploy
npm run db:seed               # catalog + demo accounts
npm run dev                   # http://localhost:3000
```

Demo accounts (password `password123`): `admin@vrsidekick.test`, `host@vrsidekick.test`,
`sam@vrsidekick.test`, `greenwave@vrsidekick.test`, `fixit@vrsidekick.test`. The demo data is around Destin, FL (ZIP 32541).

Without Stripe keys the app runs in demo mode: completed jobs are marked paid (see `SIMULATE_PAYMENTS`).

```bash
npm test          # unit tests: availability math, recurrence (DST-safe), fee calculation
npm run lint      # TypeScript check
```

### Mobile

```bash
cd vrsidekick/mobile
npm install
EXPO_PUBLIC_API_URL=http://<your-computer-ip>:3000 npx expo start   # scan with Expo Go
```

The mobile app covers dashboard, search and booking, recurring requests, accept/decline/complete, calendar,
chat, wanted ads, payment/payout setup (opens Stripe in the browser), quick block-out time and reviews. Deep
profile, rate and weekly-schedule editing, plus the admin backend, are on the web, which is also responsive and installable as a PWA.

## Stripe setup

1. Enable **Connect** in the Stripe dashboard (Express accounts).
2. Set `STRIPE_SECRET_KEY` and `APP_URL`.
3. Add a webhook to `https://<APP_URL>/api/payments/webhook` for `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `charge.refunded`, `account.updated` and `setup_intent.succeeded`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.

When Stripe is configured, hosts must have a card on file before booking, and Sidekicks must finish payout
onboarding before accepting jobs.

## Deployment notes

- Any Node host works (Vercel, Render, Fly…) with a managed Postgres. Run `npx prisma migrate deploy` on release.
- Schedule `GET /api/cron/recurring` daily with `Authorization: Bearer $CRON_SECRET`. `web/vercel.json` already does this on Vercel.
- ZIP geocoding uses the free zippopotam.us API and caches results in the `ZipGeo` table.

## Architecture

- `web/prisma/schema.prisma`: data model (users, Sidekick profiles, catalog, availability, jobs, recurring
  series, conversations, wanted ads, reviews, platform settings).
- `web/src/lib/`: domain logic. `availability.ts` (interval math), `recurrence.ts`, `fees.ts`, `stripe.ts` and
  `services/` (jobs, search, chat).
- `web/src/app/api/`: REST endpoints. Auth is a JWT, sent as an httpOnly cookie on the web or a `Bearer` token on mobile.
- `web/src/app/`: web UI (Tailwind, branded navy, gold and red).

## Suggested next steps

- Push notifications (Expo Notifications) and email/SMS for new requests and messages.
- Websocket or hosted realtime for chat (currently 4-second polling).
- Photo uploads (job completion proof, profile pictures) via S3 or similar.
- Background checks / ID verification for Sidekicks. Dispute and refund tools in the admin.
