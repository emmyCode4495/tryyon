"use client";

import { useEffect, useState } from "react";
import {
  detectIsNigeria,
  getRegionPricing,
  type RegionPricing,
} from "@/lib/currency";

/**
 * Resolves whether the visitor is in Nigeria and returns formatters.
 * Uses timezone/locale first, then optionally refines with IP country.
 */
export function useCurrency(): RegionPricing & { ready: boolean } {
  const [isNigeria, setIsNigeria] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Fast local signal
      let ng = detectIsNigeria();

      // Refine with IP country when possible (non-blocking for UI)
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 2500);
        const res = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
        });
        window.clearTimeout(timer);
        if (res.ok) {
          const data = (await res.json()) as { country_code?: string };
          if (data.country_code) {
            ng = detectIsNigeria(data.country_code);
          }
        }
      } catch {
        // Keep timezone/locale result
      }

      if (!cancelled) {
        setIsNigeria(ng);
        setReady(true);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...getRegionPricing(isNigeria), ready };
}
