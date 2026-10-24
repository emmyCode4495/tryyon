/** Credit costs */
export const CREDIT_COSTS = {
  snapshot: 2,
  clip: 20,
  realtime_15s: 30,
} as const;

/** Top-up packages (NGN → credits) */
export const CREDIT_PACKS = [
  { id: "pack_50", credits: 50, amountNgn: 1500, label: "50 credits" },
  { id: "pack_200", credits: 200, amountNgn: 5000, label: "200 credits", popular: true },
  { id: "pack_500", credits: 500, amountNgn: 11000, label: "500 credits" },
  { id: "pack_1000", credits: 1000, amountNgn: 20000, label: "1,000 credits" },
] as const;

export const PLANS = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    credits: 10,
    features: ["10 credits (5 snapshots)", "Watermarked results"],
  },
  {
    id: "shopper",
    name: "Shopper",
    priceMonthly: 6,
    credits: 200,
    features: ["200 credits / month", "No watermarks", "Download & share"],
    popular: true,
  },
  {
    id: "vendor",
    name: "Vendor",
    priceMonthly: 24,
    credits: 800,
    features: ["800 credits / month", "Short clips & exports", "Priority generation"],
  },
] as const;
