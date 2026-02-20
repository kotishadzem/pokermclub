"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export function useLiveData(fetchFn: () => Promise<void>, intervalMs: number) {
  const versionRef = useRef<number>(-1);
  const [connected, setConnected] = useState(true);

  const stableFetch = useCallback(fetchFn, [fetchFn]);

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!active) return;
      try {
        const res = await fetch("/api/version");
        if (!active) return;
        const { version } = await res.json();
        setConnected(true);
        if (version !== versionRef.current) {
          versionRef.current = version;
          await stableFetch();
        }
      } catch {
        setConnected(false);
      }
    }

    // Initial fetch
    poll();

    const id = setInterval(poll, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [stableFetch, intervalMs]);

  return { connected };
}
