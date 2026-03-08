# Opening Balances Page Enhancement — COMPLETED

## What was done

### Step 1: PUT /api/rake-collections/[id]
- New file: `src/app/api/rake-collections/[id]/route.ts`
- Accepts optional: amount, notes, tableId
- Validates amount > 0, tableId exists
- ADMIN + CASHIER roles

### Step 2: PUT /api/tips/[id]
- New file: `src/app/api/tips/[id]/route.ts`
- Same pattern as rake collections
- ADMIN + CASHIER roles

### Step 3: Cashier Opening Balances Page Enhancement
- Modified: `src/app/cashier/opening-balances/page.tsx`
- Kept existing balance form at top
- Added 3 sections below, all filtered by selected date:
  - **Transactions**: table with edit modal (type, amount, currency, payment, bank account, notes)
  - **Rake Collections**: table with edit modal (amount, table, notes)
  - **Tip Collections**: table with edit modal (amount, table, notes)
- All modals use `createPortal(…, document.body)`
- All sections refresh on edit success

### Step 4: Admin Opening Balances Page
- Copied same enhancements to `src/app/admin/opening-balances/page.tsx`

## Key Files Changed
- `src/app/api/rake-collections/[id]/route.ts` (new)
- `src/app/api/tips/[id]/route.ts` (new)
- `src/app/cashier/opening-balances/page.tsx` (major rewrite)
- `src/app/admin/opening-balances/page.tsx` (same as cashier)
- `docs/ARCHITECTURE.md` (updated API routes)
