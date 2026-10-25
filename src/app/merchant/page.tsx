"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CREDIT_COSTS } from "@/lib/credits";
import { cssVars } from "@/lib/css";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import Logo from "@/components/Logo";
import EmbedGuide from "@/components/merchant/EmbedGuide";
import EmbedConfigurator from "@/components/merchant/EmbedConfigurator";

type Merchant = {
  id: string;
  name: string;
  slug: string;
  credits_balance: number;
  monthly_allowance: number;
  primary_color: string | null;
};

type UsageRow = {
  id: string;
  event: string;
  credits: number;
  created_at: string;
  meta: { product_id?: string } | null;
};

const MERCHANT_COLS = "id, name, slug, credits_balance, monthly_allowance, primary_color";
const USAGE_COLS = "id, event, credits, created_at, meta";
const POLL_MS = 15000;

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .slice(0, 40);

const EVENT_LABELS: Record<string, string> = {
  snapshot: "Snapshot try-on",
  clip: "Clip try-on",
  realtime: "Live mirror session",
};

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-ink-50" aria-busy="true" aria-label="Loading merchant dashboard">
      <div className="h-14 border-b border-ink-100 bg-white" />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-4 w-96 max-w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="skeleton h-36 rounded-2xl sm:col-span-2" />
          <div className="skeleton h-36 rounded-2xl" />
        </div>
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    </div>
  );
}

function CreditsCard({ merchant }: { merchant: Merchant }) {
  const shown = useAnimatedNumber(merchant.credits_balance, 900);
  const ratio = merchant.monthly_allowance
    ? Math.min(1, Math.max(0, merchant.credits_balance / merchant.monthly_allowance))
    : 0;
  const low = ratio < 0.2;
  const tryOns = Math.floor(merchant.credits_balance / CREDIT_COSTS.snapshot);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">Credits left this month</p>
          <p className="mt-1 font-display text-5xl font-semibold tabular-nums tracking-tight text-ink-900">
            {shown}
          </p>
        </div>
        <p className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
          about {tryOns} try-ons
        </p>
      </div>
      <div
        className="meter mt-5 h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={merchant.monthly_allowance}
        aria-valuenow={merchant.credits_balance}
        aria-label="Credits remaining"
      >
        <div
          className="meter-fill h-full origin-left rounded-full"
          data-low={low}
          style={cssVars({ "--p": ratio })}
        />
      </div>
      <p className="mt-2 text-xs text-ink-500">
        Monthly allowance {merchant.monthly_allowance}. Each shopper try-on costs {CREDIT_COSTS.snapshot} credits.
      </p>
    </div>
  );
}

function UsageList({ usage, fresh }: { usage: UsageRow[]; fresh: Set<string> }) {
  if (usage.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center px-2 py-8 text-center">
        <div className="relative h-24 w-[4.5rem] overflow-hidden" aria-hidden="true">
          <div className="arch absolute inset-0 border-2 border-dashed border-ink-300" />
          <div className="scan-soft absolute inset-x-0 h-0.5 bg-chalk-500" />
        </div>
        <p className="mt-5 font-display text-base font-semibold text-ink-900">Waiting for the first try-on</p>
        <p className="mt-1 max-w-[16rem] text-sm text-ink-500">
          Once a shopper uses your embed, it shows up here within a few seconds.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-ink-100">
      {usage.map((u, i) => (
        <li
          key={u.id}
          data-fresh={fresh.has(u.id)}
          className="usage-row flex items-center justify-between gap-3 py-3 text-sm"
          style={cssVars({ "--d": `${Math.min(i, 10) * 0.045}s` })}
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800">{EVENT_LABELS[u.event] ?? u.event}</p>
            <p className="truncate text-xs text-ink-400">
              {timeAgo(u.created_at)}
              {u.meta?.product_id ? ` · ${u.meta.product_id}` : ""}
            </p>
          </div>
          <span className="tabular-nums text-ink-600">−{u.credits}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MerchantDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  const loadUsage = useCallback(async (merchantId: string, flagNew: boolean) => {
    const supabase = createClient();
    const [{ data: u }, { data: m }] = await Promise.all([
      supabase
        .from("merchant_usage")
        .select(USAGE_COLS)
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("merchants").select(MERCHANT_COLS).eq("id", merchantId).maybeSingle(),
    ]);

    const rows = (u as UsageRow[]) || [];
    if (flagNew) {
      const added = rows.filter((r) => !knownIds.current.has(r.id)).map((r) => r.id);
      if (added.length) {
        setFresh(new Set(added));
        window.setTimeout(() => setFresh(new Set()), 3500);
      }
    }
    knownIds.current = new Set(rows.map((r) => r.id));
    setUsage(rows);
    if (m) setMerchant(m as Merchant);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/merchant");
        return;
      }

      const { data: m } = await supabase
        .from("merchants")
        .select(MERCHANT_COLS)
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (m) {
        setMerchant(m);
        await loadUsage(m.id, false);
      }
      setLoading(false);
    })();
  }, [router, loadUsage]);

  // Quiet refresh so merchants see embed activity arrive while the page is open
  const merchantId = merchant?.id;
  useEffect(() => {
    if (!merchantId) return;
    const tick = () => {
      if (document.visibilityState === "visible") loadUsage(merchantId, true);
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [merchantId, loadUsage]);

  async function createMerchant(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { data, error: err } = await supabase
      .from("merchants")
      .insert({
        owner_user_id: user.id,
        name: name.trim() || "My store",
        slug: slugify(slug) || slugify(name) || "my-store",
        credits_balance: 500,
        monthly_allowance: 500,
      })
      .select(MERCHANT_COLS)
      .single();

    setCreating(false);
    if (err) {
      setError(err.message.includes("duplicate") ? "That store key is taken. Try another." : err.message);
      return;
    }
    setMerchant(data);
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/studio" className="link-u text-sm font-medium text-ink-600 hover:text-ink-900">
            Studio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="rise" style={cssVars({ "--d": "0s" })}>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            {merchant ? merchant.name : "Merchant embed"}
          </h1>
          <p className="mt-2 max-w-xl text-ink-600">
            Put virtual try-on on your product pages. Shoppers see the garment on themselves before they buy, and
            you only pay in credits when they try one on.
          </p>
        </div>

        {!merchant ? (
          <form
            onSubmit={createMerchant}
            className="rise mt-10 max-w-md space-y-5 rounded-3xl border border-ink-100 bg-white p-6 sm:p-8"
            style={cssVars({ "--d": "0.12s" })}
          >
            <h2 className="font-display text-xl font-semibold text-ink-900">Set up your store</h2>
            {error && (
              <p role="alert" className="shake rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Store name</span>
              <input
                className="field mt-1.5"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="Acme Fashion"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Store key</span>
              <input
                className="field mt-1.5"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="acme-fashion"
                required
              />
              <span className="mt-2 block truncate rounded-lg bg-ink-100 px-3 py-2 font-mono text-[11px] text-ink-600">
                /embed?merchant=<span className="font-semibold text-chalk-700">{slug || "your-key"}</span>
              </span>
            </label>
            <button type="submit" disabled={creating} className="btn-primary h-11 w-full rounded-full text-sm font-semibold">
              {creating ? "Creating…" : "Create merchant account"}
            </button>
            <p className="text-center text-xs text-ink-500">Starts with 500 credits, about 250 try-ons.</p>
          </form>
        ) : (
          <div className="mt-10 space-y-14">
            <div className="rise grid gap-4 sm:grid-cols-3" style={cssVars({ "--d": "0.1s" })}>
              <CreditsCard merchant={merchant} />
              <div className="rounded-2xl border border-ink-100 bg-white p-6">
                <p className="text-sm text-ink-500">Your store key</p>
                <p className="mt-1 truncate font-mono text-lg font-semibold text-ink-900">{merchant.slug}</p>
                <p className="mt-5 text-sm text-ink-500">Recent try-ons</p>
                <p className="font-display text-2xl font-semibold tabular-nums text-ink-900">{usage.length}</p>
              </div>
            </div>

            <section aria-labelledby="how-embed">
              <h2 id="how-embed" className="font-display text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                How to add it to your store
              </h2>
              <p className="mt-2 max-w-xl text-ink-600">Three steps, about two minutes. Watch what your shoppers will see.</p>
              <div className="mt-10">
                <EmbedGuide slug={merchant.slug} />
              </div>
            </section>

            <section aria-labelledby="your-embed" className="grid gap-8 lg:grid-cols-5 lg:gap-10">
              <div className="lg:col-span-3">
                <h2 id="your-embed" className="font-display text-2xl font-semibold tracking-tight text-ink-900">
                  Your embed
                </h2>
                <p className="mb-6 mt-1 text-sm text-ink-500">
                  Set it up for a product, then copy. The preview uses the same settings.
                </p>
                <div className="rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
                  <EmbedConfigurator slug={merchant.slug} />
                </div>
              </div>

              <aside className="lg:col-span-2">
                <div className="lg:sticky lg:top-20">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">Recent usage</h2>
                    <span className="live-dot inline-flex items-center gap-1.5 text-xs text-ink-500">
                      <i className="h-1.5 w-1.5 rounded-full bg-chalk-500" aria-hidden="true" />
                      Live
                    </span>
                  </div>
                  <div className="mt-4 max-h-[34rem] overflow-y-auto rounded-3xl border border-ink-100 bg-white px-5 pb-2 pt-1">
                    <UsageList usage={usage} fresh={fresh} />
                  </div>
                </div>
              </aside>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
