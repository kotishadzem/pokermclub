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
| Real-time | Socket.io (planned) |
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
│   │   ├── pitboss/            # Pit Boss role pages
│   │   ├── cashier/            # Cashier role pages
│   │   ├── dealer/             # Dealer role pages
│   │   ├── players/            # Shared player pages
│   │   └── api/auth/           # NextAuth API routes
│   ├── components/
│   │   ├── providers.tsx       # SessionProvider wrapper
│   │   └── layouts/
│   │       └── sidebar.tsx     # Role-based sidebar navigation
│   ├── lib/
│   │   └── prisma.ts           # Prisma client singleton
│   ├── types/
│   │   └── next-auth.d.ts      # NextAuth type extensions
│   └── generated/prisma/       # Generated Prisma client (gitignored)
└── docs/
    └── ARCHITECTURE.md          # This file
```

## User Roles

| Role | Routes | Capabilities |
|------|--------|-------------|
| Admin | `/admin/*` | Full system access, user management, configuration |
| Pit Boss | `/pitboss/*`, `/players/*` | Floor control, tables, waiting list, player placement |
| Cashier | `/cashier/*`, `/players/*` | Financial operations, buy-in/cash-out, reports |
| Dealer | `/dealer/*` | View assigned table, record rake |
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
- **Transaction** — All financial operations (buy-in, cash-out, deposit, withdrawal, rakeback)
- **RakeRecord** — Rake collected per pot per session

### Key Relationships

```
User (staff) ──┬── TableSession (as dealer)
               └── Transaction (recorded by)

Player ──┬── TableSeat (seated at)
         ├── WaitingList (queued for)
         ├── Transaction (financial ops)
         └── RakeRecord (rake attributed to)

Table ──┬── TableSession (active session)
        └── WaitingList (queue)

GameType ── Table (game played)
PlayerStatus ── Player (classification)
```

## Docker Setup

Two services:
- **app**: Next.js dev server on port 3000, auto-runs migrations on start
- **db**: PostgreSQL 16 on port 5432, with healthcheck

```bash
docker compose up        # Start both services
docker compose exec app npx prisma migrate dev  # Create/apply migration
docker compose exec app npm run seed            # Seed data
```

## Implementation Phases

1. **Foundation & Auth** ✅ — Project setup, Docker, schema, auth, login
2. **Admin Panel** — User/config management (CRUD)
3. **Player Registration** — Player profiles, search, photo upload
4. **Pit Boss Floor** — Table management, graphical floor plan, waiting list
5. **Cashier Interface** — Buy-in, cash-out, transaction history, reports
6. **Dealer Interface** — Table view, rake recording
7. **Rakeback System** — Rake tracking, automatic calculation, payouts
