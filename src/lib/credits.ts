/** Credit costs */
export const CREDIT_COSTS = {
  snapshot: 2,
  clip: 20,
  realtime_15s: 30,
} as const;

// Re-export pricing so existing imports keep working
export {
  CREDIT_PACKS,
  PLANS,
  type CreditPack,
  packPrice,
  planPrice,
  USD_TO_NGN,
} from "./currency";
