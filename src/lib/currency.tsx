"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "GEL", symbol: "\u10DA", name: "Georgian Lari" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
];

const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

interface CurrencyContextValue {
  currency: CurrencyInfo;
  formatMoney: (amount: number) => string;
  setCurrency: (code: string) => Promise<void>;
}

const defaultCurrency = CURRENCY_MAP.GEL;

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: defaultCurrency,
  formatMoney: (amount) => `${defaultCurrency.symbol}${amount.toFixed(2)}`,
  setCurrency: async () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyInfo>(defaultCurrency);

  useEffect(() => {
    fetch("/api/settings/currency")
      .then((r) => r.json())
      .then((data) => {
        const info = CURRENCY_MAP[data.currency];
        if (info) setCurrencyState(info);
      })
      .catch(() => {});
  }, []);

  const formatMoney = useCallback(
    (amount: number) => `${currency.symbol}${amount.toFixed(2)}`,
    [currency.symbol],
  );

  const setCurrency = useCallback(async (code: string) => {
    const info = CURRENCY_MAP[code];
    if (!info) return;
    const res = await fetch("/api/settings/currency", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: code }),
    });
    if (res.ok) setCurrencyState(info);
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, formatMoney, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
