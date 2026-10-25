"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon } from "./icons";
import { useCurrency } from "@/hooks/useCurrency";
import { PLANS, planPrice } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";

type Variant = "free" | "featured" | "dark";

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

function planVariant(id: string): Variant {
  if (id === "shopper") return "featured";
  if (id === "vendor") return "dark";
  return "free";
}

export default function Pricing() {
  const { format, isNigeria } = useCurrency();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <section id="pricing" className="relative scroll-mt-24 bg-ink-50 py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-chalk-600">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Start free. Pay when it works.
          </h2>
          <p className="mt-4 text-ink-600">
            Credits power every try-on. Buy a pack or pick a plan — charged in{" "}
            {isNigeria ? "naira" : "dollars"} based on where you are.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-base font-semibold text-ink-900">Credit rates</h3>
          <div className="mt-4">
            <ul className="space-y-3 text-sm text-ink-700">
              {RATES.map((r) => (
                <li key={r.label} className="flex items-baseline gap-3">
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
            const variant = planVariant(plan.id);
            const dark = variant === "dark";
            const price = planPrice(plan, isNigeria);
            const priceLabel = format(price);

            // Stay logged in: go to studio (or top-up). Guests: login then studio.
            const href =
              plan.id === "free"
                ? loggedIn
                  ? "/studio"
                  : "/signup"
                : loggedIn
                  ? "/studio?tab=profile"
                  : `/login?next=${encodeURIComponent("/studio?tab=profile")}`;

            return (
              <div key={plan.id} className={`rounded-[1.75rem] p-7 sm:p-8 ${card[variant]}`}>
                {variant === "featured" && (
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
                    {priceLabel}
                  </span>
                  {plan.id !== "free" && (
                    <span className={`text-sm ${dark ? "text-ink-300" : "text-ink-600"}`}>
                      /month
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

                {plan.id === "free" ? (
                  <button
                    type="button"
                    disabled
                    className={`mt-8 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition duration-200 ${button[variant]}`}
                  >
                    {loggedIn ? "Current plan" : "Free to start"}
                  </button>
                ) : (
                  <Link
                    href={href}
                    className={`mt-8 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition duration-200 ${button[variant]}`}
                  >
                    {loggedIn ? `Continue with ${plan.name}` : `Get ${plan.name}`}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
