/** Credit costs */
export const CREDIT_COSTS = {
  snapshot: 2,
  clip: 20,
  realtime_15s: 30,
  /** Fast-mode realtime (2× standard) */
  realtime_fast_15s: 60,
} as const;

/** Who can use live mirror without buying add-on */
export function canUseRealtimeMirror(plan: string | undefined, mirrorAddon?: boolean) {
  return plan === "vendor" || !!mirrorAddon;
}

// Re-export pricing so existing imports keep working
export {
  CREDIT_PACKS,
  PLANS,
  type CreditPack,
  packPrice,
  planPrice,
  USD_TO_NGN,
} from "./currency";
