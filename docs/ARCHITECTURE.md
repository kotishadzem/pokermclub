# Poker Club Management System — Architecture

## Overview

A web-based management system for a physical poker club. Staff (not players) use the system to manage player registration, cashier operations, pit boss floor control, dealer assignments, and table visualization.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 |
| Auth | NextAuth.js v5 (credentials provider, JWT sessions) |
| Containerization | Docker + Docker Compose |

## Project Structure

```
pokemclub/
├── docker-compose.yml          # App + PostgreSQL services
├── Dockerfile                  # Next.js container
├── prisma/
│   ├── schema.prisma           # Database models
│   ├── prisma.config.ts        # Prisma datasource config
│   └── seed.ts                 # Default admin + seed data
├── src/
│   ├── auth.ts                 # NextAuth configuration
│   ├── middleware.ts            # Role-based route protection
│   ├── app/
│   │   ├── layout.tsx          # Root layout + SessionProvider
│   │   ├── page.tsx            # Redirect to /login
│   │   ├── login/page.tsx      # Login page
│   │   ├── admin/              # Admin role pages
│   │   │   ├── dashboard/      # Admin dashboard
│   │   │   ├── users/          # Staff user management (CRUD)
│   │   │   ├── game-types/     # Game type configuration
│   │   │   ├── player-statuses/# Player status configuration
│   │   │   ├── bank-accounts/  # Bank account management
│   │   │   ├── rakeback-config/# Rakeback % per player
│   │   │   ├── opening-balances/# Daily opening balance configuration
│   │   │   └── tables/         # Table CRUD management (admin)
│   │   ├── pitboss/            # Pit Boss role pages
│   │   │   ├── floor-plan/     # Graphical drag-drop floor plan
│   │   │   ├── tables/         # Table CRUD management
│   │   │   └── waiting-list/   # Waiting list management
│   │   ├── cashier/            # Cashier role pages
│   │   │   ├── dashboard/      # Channel cards, Rake/Tips/Balance summary, player search, tip collection form
│   │   │   ├── transactions/   # Transaction history + filters + Recent Tips table
│   │   │   └── reports/        # Daily financial reports
│   │   ├── dealer/             # Dealer role pages
│   │   │   └── table/          # Assigned table + rake recording
│   │   ├── registrator/        # Registrator role pages
│   │   │   └── dashboard/      # Room check-in/check-out
│   │   ├── players/            # Shared player pages
│   │   │   ├── list/           # Player list with search/filter
│   │   │   ├── register/       # Player registration form
│   │   │   └── [id]/           # Player profile + edit
│   │   └── api/                # API Routes
│   │       ├── auth/           # NextAuth handlers
│   │       ├── users/          # Staff user CRUD
│   │       ├── players/        # Player CRUD + search
│   │       ├── tables/         # Table CRUD + sessions + seats
│   │       ├── transactions/   # Transaction CRUD + reports
│   │       ├── waiting-list/   # Waiting list management
│   │       ├── rake/           # Rake recording
│   │       ├── tips/           # Tip collections (cashier ← dealer)
│   │       ├── rakeback/       # Rakeback calculation
│   │       ├── dealer/         # Dealer's assigned table
│   │       ├── game-types/     # Game type CRUD
│   │       ├── bank-accounts/  # Bank account CRUD (soft-delete)
│   │       ├── opening-balances/# Opening balance GET + upsert
│   │       ├── player-statuses/# Player status CRUD
│   │       ├── room-visits/   # Room visit check-in/check-out
│   │       └── upload/         # File upload (player photos)
│   ├── components/
│   │   ├── providers.tsx       # SessionProvider wrapper
│   │   └── layouts/
│   │       └── sidebar.tsx     # Role-based sidebar navigation
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton (PrismaPg adapter)
│   │   ├── api-auth.ts         # API route auth helper (requireRole)
│   │   ├── version.ts          # Global version counter for real-time polling
│   │   └── use-live-data.ts    # Client hook: polls /api/version, re-fetches on change
│   ├── types/
│   │   └── next-auth.d.ts      # NextAuth type extensions
│   └── generated/prisma/       # Generated Prisma client (gitignored)
└── docs/
    └── ARCHITECTURE.md          # This file
```

## User Roles

| Role | Routes | Capabilities |
|------|--------|-------------|
| Admin | `/admin/*`, all routes | Full system access, user management, configuration, rakeback config, opening balances |
| Pit Boss | `/pitboss/*`, `/players/*` | Floor control, tables, waiting list, player placement |
| Cashier | `/cashier/*`, `/players/*` | Financial operations, buy-in/cash-out, transaction history, reports |
| Dealer | `/dealer/*` | View assigned table, record rake per pot |
| Registrator | `/registrator/*`, `/players/*` | Player check-in/check-out, room occupancy tracking, player registration |
| Player | N/A (no login) | Registered by staff, profile managed by staff |

## Authentication Flow

1. User visits any page → middleware checks session
2. No session → redirect to `/login`
3. Login form submits credentials to NextAuth
4. NextAuth `authorize()` verifies against `User` table (bcrypt)
5. JWT token issued with `id`, `name`, `role`
6. Middleware checks role against route prefix
7. Admin can access all routes; others restricted to their prefix
8. Root `/` redirects to role-specific dashboard

## API Routes

### Players
- `GET /api/players?search=` — List/search players
- `POST /api/players` — Register player
- `GET /api/players/[id]` — Player detail (with transactions)
- `PUT /api/players/[id]` — Update player

### Tables
- `GET /api/tables` — List tables (with sessions, seats, waiting list)
- `POST /api/tables` — Create table
- `PUT /api/tables/[id]` — Update table (name, blinds, position)
- `DELETE /api/tables/[id]` — Delete table
- `POST /api/tables/[id]/session` — Open table (create session)
- `DELETE /api/tables/[id]/session` — Close table (end session)
- `POST /api/tables/[id]/seats` — Seat player
- `DELETE /api/tables/[id]/seats` — Unseat player

### Transactions
- `GET /api/transactions?type=&from=&to=&limit=` — List transactions with filters
- `POST /api/transactions` — Create transaction (outgoing transactions check available balance: opening + in - out; returns 400 "Insufficient funds" if exceeded)
- `PUT /api/transactions/[id]` — Edit transaction (amount, type, paymentMethod, bankAccountId, notes, currencyId). Recalculates amountInGel on currency change. Balance validation for outgoing types excludes the original transaction.
- `GET /api/transactions/reports?date=` — Daily report with aggregates + per-channel breakdown (Cash, per-bank-account, Deposits). Each channel includes `opening`, `in`, `out`, `net`, and `balance` fields.

### Opening Balances
- `GET /api/opening-balances?date=` — Get opening balances for a date
- `POST /api/opening-balances` — Upsert opening balances (Admin only). Body: `{ date, time, balances: [{ channel, amount }] }`. Channel is `"CASH"`, `"DEPOSITS"`, or a bank account ID.

### Waiting List
- `GET /api/waiting-list` — List entries (grouped by table)
- `POST /api/waiting-list` — Add to waiting list
- `DELETE /api/waiting-list/[id]` — Remove from list

### Rake
- `POST /api/rake` — Record rake (pot amount + rake amount + tip amount)
- `GET /api/rake?tableSessionId=` — Get rake history for session (includes totalTips)

### Tips
- `POST /api/tips` — Record tip collection (cashier receives tips from dealer). Body: `{ tableId, amount, notes? }`
- `GET /api/tips?date=` — Tips report for date (default: today). Returns `{ date, grandTotal, byTable: [{tableId, tableName, total, count}], collections: [...] }`

### Rakeback
- `GET /api/rakeback?playerId=` — Calculate rakeback for player(s)

### Admin
- `GET /api/admin/stats` — Dashboard stats (player count, open tables, today's rake, today's tips, staff, recent activity)
- `GET/POST /api/users` — List/create staff users
- `PUT/DELETE /api/users/[id]` — Update/deactivate user
- `GET/POST /api/game-types` — List/create game types
- `GET/POST /api/bank-accounts` — List/create bank accounts (soft-delete via active flag)
- `PUT/DELETE /api/bank-accounts/[id]` — Update/deactivate bank account
- `GET/POST /api/player-statuses` — List/create player statuses

### Room Visits
- `GET /api/room-visits` — Today's visits + inRoom count (ADMIN, REGISTRATOR)
- `POST /api/room-visits` — Check-in player: `{ playerId, checkedIn? }` (ADMIN, REGISTRATOR). Optional `checkedIn` ISO datetime overrides default `now()`.
- `PATCH /api/room-visits` — Check-out: `{ visitId, checkedOut? }` (ADMIN, REGISTRATOR). Optional `checkedOut` ISO datetime overrides default `now()`.

### Dealers
- `GET /api/dealers` — List active dealers (for assignment dropdown)

### Real-time
- `GET /api/version` — Returns global version counter (for smart polling)

## Database Schema

### Core Models

- **User** — Staff accounts (admin, pitboss, cashier, dealer)
- **Player** — Registered club players (managed by staff)
- **PlayerStatus** — Configurable statuses (Regular, VIP, Premium, Banned)
- **GameType** — Game configurations (NL Hold'em, PLO, etc.)
- **Table** — Physical tables with position, blinds, buy-in limits
- **TableSession** — Active table session with assigned dealer
- **TableSeat** — Player seated at a table during a session
- **WaitingList** — Queue for tables
- **BankAccount** — Bank accounts for bank payment method (name, active flag for soft-delete)
- **Transaction** — All financial operations (buy-in, cash-out, deposit, withdrawal, rakeback payout). Includes `paymentMethod` (CASH/BANK) and optional `bankAccountId` for bank transactions.
- **OpeningBalance** — Starting balance per channel per date. Channel is `"CASH"`, `"DEPOSITS"`, or a bank account ID. Unique on `[date, channel]`. Used for balance checks on outgoing transactions and displayed on dashboard/reports.
- **RakeRecord** — Rake and tips collected per pot per session (fields: potAmount, rakeAmount, tipAmount)
- **TipCollection** — Physical tip cash received by cashier from dealer (fields: tableId, amount, notes, userId)
- **RoomVisit** — Player room check-in/check-out tracking (fields: playerId, userId, checkedIn, checkedOut)

### Key Relationships

```
User (staff) ──┬── TableSession (as dealer)
               ├── Transaction (recorded by)
               ├── OpeningBalance (set by)
               └── RoomVisit (checked in by)

Player ──┬── TableSeat (seated at)
         ├── WaitingList (queued for)
         ├── Transaction (financial ops)
         ├── RakeRecord (rake attributed to)
         └── RoomVisit (room check-in/out)

Table ──┬── TableSession (active session)
        ├── WaitingList (queue)
        └── TipCollection (tips received)

GameType ── Table (game played)
PlayerStatus ── Player (classification)
```

## Docker Setup

Two services:
- **app**: Next.js dev server on port 3000 (host: 3002), auto-runs prisma generate + migrate on start
- **db**: PostgreSQL 16 on port 5432 (host: 5434), with healthcheck

```bash
docker compose up        # Start both services
docker compose exec app npx prisma migrate dev  # Create/apply migration
docker compose exec app npm run seed            # Seed data
```

## Implementation Phases

1. **Foundation & Auth** ✅ — Project setup, Docker, schema, auth, login
2. **Admin Panel** ✅ — User management, game types, player statuses CRUD
3. **Player Registration** ✅ — Player profiles, search, photo upload, inline editing
4. **Pit Boss Floor** ✅ — Table CRUD, graphical floor plan with drag-drop, waiting list
5. **Cashier Interface** ✅ — Player search, buy-in/cash-out, transaction history, daily reports
6. **Dealer Interface** ✅ — Assigned table view, seat map, rake recording per pot
7. **Rakeback System** ✅ — Per-player rakeback %, calculation, balance tracking, admin config
8. **Admin Dashboard + Dealer Assignment + Real-time** ✅ — Live stats & activity feed, dealer dropdown on floor plan, version-counter polling (3-10s intervals)
9. **Opening Balances** ✅ — Per-channel daily opening balances (Cash, bank accounts, Deposits), balance validation on outgoing transactions, OPENING/IN/OUT/BALANCE channel cards on dashboard and reports
10. **Tip Collections** ✅ — Cashier records physical tip cash received from dealers per table. Dashboard shows summary total (Tips Collected card alongside Rake and Total Balance). Tip collection history is displayed on the Transactions page. Reports include `totalTipsCollected`.
11. **Registrator Role** ✅ — Room visit tracking (check-in/check-out) via modal dialogs with editable datetime pickers, player registration access, live room occupancy counter with 5s polling.

## Real-time Update System

Uses lightweight version-counter polling instead of WebSockets:

1. **Server side**: `src/lib/version.ts` holds a `globalThis` counter. Every mutation API route calls `bumpVersion()` after successful writes.
2. **API**: `GET /api/version` returns the current counter value (`force-dynamic`).
3. **Client hook**: `useLiveData(fetchFn, intervalMs)` polls `/api/version` every N ms. Only calls `fetchFn` when version changes.

| Screen | Poll Interval | Fetch Function |
|--------|--------------|----------------|
| Floor Plan (pitboss) | 3s | Tables + sessions + seats |
| Dealer Table | 3s | Assigned table + seats + rake |
| Waiting List | 5s | Entries + tables |
| Cashier Dashboard | 5s | Daily transaction report + tips report |
| Registrator Dashboard | 5s | Room visits (check-in/out) |
| Admin Dashboard | 10s | Stats + recent activity |
