# Multi-Currency System

## Overview
The system supports multiple currencies for transactions. GEL (Georgian Lari) is the base currency. All other currencies have an exchange rate to GEL, and every transaction stores both the original amount and the GEL equivalent.

## Currency Model
Each currency has: `code` (unique, e.g. "USD"), `name`, `symbol`, `exchangeRate` (to GEL), `isBase` (only GEL), `active`.

Default currencies: GEL (rate 1, base), USD (2.7), EUR (2.9), GBP (3.4).

## How Transactions Work
- When creating a transaction, the cashier can optionally select a currency
- If a non-GEL currency is selected, the API looks up the current exchange rate
- `amount` stores the original amount in the selected currency
- `amountInGel` stores `amount * exchangeRate` (the GEL equivalent)
- `exchangeRate` is snapshotted at transaction time (won't change if rate is updated later)
- `currencyCode` is denormalized for easy display

## Balance Checks
All balance checks (cash-out, withdrawal) use `amountInGel` to ensure the GEL-denominated channel balances are correct.

## Display
- Reports aggregate using `amountInGel` for totals
- Transaction rows show GEL amount as primary, with original currency notation below for non-GEL transactions
- The dashboard conversion preview shows the GEL equivalent before submitting

## API Endpoints
- `GET /api/currencies` - List active currencies (ADMIN, CASHIER)
- `POST /api/currencies` - Create currency (ADMIN)
- `PUT /api/currencies/[id]` - Update currency (ADMIN, cannot change base rate)
- `DELETE /api/currencies/[id]` - Soft-delete currency (ADMIN, cannot delete base)

## Admin Access
The currencies page is accessible at `/cashier/currencies` from both ADMIN and CASHIER sidebars. Only ADMINs can create/edit/delete currencies.
