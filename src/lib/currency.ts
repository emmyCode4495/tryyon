/**
 * Location-aware pricing: Nigeria → NGN (₦), everywhere else → USD ($).
 */

export type CurrencyCode = "NGN" | "USD";

export type RegionPricing = {
  currency: CurrencyCode;
  symbol: string;
  isNigeria: boolean;
  /** Format an amount already in the region's currency */
  format: (amount: number) => string;
};

/** Approximate display rates used when converting fixed USD plan prices to NGN */
export const USD_TO_NGN = 1600;

export const CREDIT_PACKS = [
  {
    id: "pack_50",
    credits: 50,
    amountNgn: 1500,
    amountUsd: 1,
    label: "50 credits",
  },
  {
    id: "pack_200",
    credits: 200,
    amountNgn: 5000,
    amountUsd: 3,
    label: "200 credits",
    popular: true,
  },
  {
    id: "pack_500",
    credits: 500,
    amountNgn: 11000,
    amountUsd: 7,
    label: "500 credits",
  },
  {
    id: "pack_1000",
    credits: 1000,
    amountNgn: 20000,
    amountUsd: 12,
    label: "1,000 credits",
  },
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Try it out",
    priceUsd: 0,
    priceNgn: 0,
    credits: 2,
    features: ["2 credits (1 snapshot)", "Watermarked results"],
  },
  {
    id: "shopper",
    name: "Shopper",
    tagline: "For everyday use",
    priceUsd: 6,
    priceNgn: 9500,
    credits: 200,
    features: ["200 credits / month", "No watermarks", "Download & share"],
    popular: true,
  },
  {
    id: "vendor",
    name: "Vendor",
    tagline: "For sellers & creators",
    priceUsd: 24,
    priceNgn: 38000,
    credits: 800,
    features: ["800 credits / month", "Short clips & exports", "Priority generation"],
  },
] as const;

/** Detect Nigeria from timezone, locale, or optional country code. */
export function detectIsNigeria(countryCode?: string | null): boolean {
  if (countryCode) {
    return countryCode.toUpperCase() === "NG";
  }

  if (typeof window === "undefined") return false;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Africa/Lagos") return true;
  } catch {
    /* ignore */
  }

  try {
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    if (langs.some((l) => /[-_]NG$/i.test(l) || /^ha[-_]/i.test(l) || /^yo[-_]/i.test(l) || /^ig[-_]/i.test(l))) {
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

export function getRegionPricing(isNigeria: boolean): RegionPricing {
  if (isNigeria) {
    return {
      currency: "NGN",
      symbol: "₦",
      isNigeria: true,
      format: (amount: number) =>
        amount === 0 ? "₦0" : `₦${Math.round(amount).toLocaleString("en-NG")}`,
    };
  }
  return {
    currency: "USD",
    symbol: "$",
    isNigeria: false,
    format: (amount: number) => {
      if (amount === 0) return "$0";
      // Show cents only when needed
      const rounded = Math.round(amount * 100) / 100;
      return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
    },
  };
}

export function packPrice(pack: CreditPack, isNigeria: boolean): number {
  return isNigeria ? pack.amountNgn : pack.amountUsd;
}

export function planPrice(
  plan: { priceUsd: number; priceNgn: number },
  isNigeria: boolean
): number {
  return isNigeria ? plan.priceNgn : plan.priceUsd;
}
