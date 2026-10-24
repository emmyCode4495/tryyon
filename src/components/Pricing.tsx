import { CheckIcon } from "./icons";

type Variant = "free" | "featured" | "dark";

const PLANS: {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period?: string;
  features: string[];
  cta: string;
  variant: Variant;
}[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try it out",
    price: "$0",
    features: ["10 credits (5 snapshots)", "Watermarked results"],
    cta: "Current plan",
    variant: "free",
  },
  {
    id: "shopper",
    name: "Shopper",
    tagline: "For everyday use",
    price: "$6",
    period: "/month",
    features: ["200 credits / month", "No watermarks", "Download & share"],
    cta: "Get Shopper",
    variant: "featured",
  },
  {
    id: "vendor",
    name: "Vendor",
    tagline: "For sellers & creators",
    price: "$24",
    period: "/month",
    features: ["800 credits / month", "Short clips & exports", "Priority generation"],
    cta: "Get Vendor",
    variant: "dark",
  },
];

const RATES = [
  { label: "Snapshot try-on", cost: 2 },
  { label: "5-second try-on clip", cost: 20 },
  { label: "Realtime mirror, 15-second session", cost: 30 },
];

const card: Record<Variant, string> = {
  free: "border-2 border-dashed border-ink-300 text-ink-900",
  featured:
    "relative border border-chalk-500 bg-white text-ink-900 shadow-[0_30px_60px_-30px_rgba(76,92,255,0.45)] ring-4 ring-chalk-500/10 md:-translate-y-5 md:py-12",
  dark: "bg-ink-900 text-white",
};

const button: Record<Variant, string> = {
  free: "border border-ink-300 text-ink-500 cursor-default",
  featured:
    "bg-chalk-500 text-white shadow-[0_12px_28px_-12px_rgba(76,92,255,0.9)] hover:bg-chalk-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  dark: "bg-white text-ink-900 hover:bg-ink-100 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
};

export default function Pricing() {
  return (
    <section id="pricing" className="bg-ink-100 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-end">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Simple credit plans
            </h2>
            <p className="mt-4 max-w-md text-lg text-ink-600">
              One credit system for snapshots, clips, and realtime. No surprises.
            </p>
          </div>

          {/* Price list, like a tailor's rate card */}
          <div className="lg:max-w-md lg:justify-self-end lg:w-full">
            <h3 className="font-display text-lg font-semibold text-ink-900">What credits buy</h3>
            <ul className="mt-4 space-y-3">
              {RATES.map((r) => (
                <li key={r.label} className="flex items-baseline gap-3 text-ink-700">
                  <span>{r.label}</span>
                  <span
                    aria-hidden="true"
                    className="flex-1 -translate-y-1 border-b-2 border-dotted border-ink-300"
                  />
                  <span className="whitespace-nowrap font-display font-semibold tabular-nums text-ink-900">
                    {r.cost} credits
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3 md:items-center">
          {PLANS.map((plan) => {
            const dark = plan.variant === "dark";
            return (
              <div key={plan.id} className={`rounded-[1.75rem] p-7 sm:p-8 ${card[plan.variant]}`}>
                {plan.variant === "featured" && (
                  <span className="absolute -top-3.5 left-8 rounded-full bg-chalk-500 px-3.5 py-1 text-xs font-semibold text-white">
                    Popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className={`mt-1 text-sm ${dark ? "text-ink-300" : "text-ink-600"}`}>
                  {plan.tagline}
                </p>

                <p className="mt-7 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${dark ? "text-ink-300" : "text-ink-600"}`}>
                      {plan.period}
                    </span>
                  )}
                </p>

                <ul className={`mt-7 space-y-3 text-sm ${dark ? "text-ink-200" : "text-ink-700"}`}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon
                        className={`mt-px h-5 w-5 shrink-0 ${dark ? "text-thread-500" : "text-chalk-500"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`mt-9 h-12 w-full rounded-full text-sm font-semibold transition duration-300 ${button[plan.variant]}`}
                  aria-disabled={plan.variant === "free" || undefined}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
