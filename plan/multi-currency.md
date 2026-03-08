# Multi-Currency System - COMPLETED

## What was done
1. **Schema**: Added `Currency` model + extended `Transaction` with `currencyId`, `currencyCode`, `exchangeRate`, `amountInGel`
2. **Migration**: Applied migration, backfilled existing transactions with GEL defaults, seeded GEL/USD/EUR/GBP
3. **API**: CRUD at `/api/currencies` and `/api/currencies/[id]` (ADMIN-only create/edit/delete, CASHIER can read)
4. **Currencies Page**: `/cashier/currencies` - table with add/edit/delete modals, GEL row protected
5. **Sidebar**: Added "Currencies" link in ADMIN and CASHIER nav configs
6. **Transaction API**: Accepts `currencyId`, looks up rate, calculates `amountInGel`, balance check uses GEL amounts
7. **Transaction Form**: Currency dropdown next to Amount, conversion preview for non-GEL currencies
8. **Display Pages**: Transactions and Reports show GEL amounts with original currency notation for non-GEL transactions

## Key files
- `prisma/schema.prisma` - Currency model, Transaction currency fields
- `prisma/seed.ts` - Default currency seeding
- `src/app/api/currencies/route.ts` - GET/POST
- `src/app/api/currencies/[id]/route.ts` - PUT/DELETE
- `src/app/cashier/currencies/page.tsx` - Currencies management page
- `src/components/layouts/sidebar.tsx` - Nav items
- `src/app/api/transactions/route.ts` - Currency-aware transaction creation
- `src/app/api/transactions/reports/route.ts` - GEL-based aggregation
- `src/app/cashier/dashboard/page.tsx` - Currency selector in form
- `src/app/cashier/transactions/page.tsx` - Currency display
- `src/app/cashier/reports/page.tsx` - Currency display
