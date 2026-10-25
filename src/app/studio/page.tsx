"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TryOnStudio from "@/components/TryOnStudio";
import RealtimeMirror from "@/components/RealtimeMirror";
import { CREDIT_PACKS, packPrice } from "@/lib/currency";
import { useCurrency } from "@/hooks/useCurrency";
import Logo from "@/components/Logo";
import { CREDIT_COSTS } from "@/lib/credits";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  credits: number;
  plan: string;
  mirror_addon?: boolean;
};

type TabId = "tryon" | "mirror" | "profile";

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: "tryon", label: "Snapshot try-on", short: "Snapshot" },
  { id: "mirror", label: "Realtime mirror", short: "Mirror" },
  { id: "profile", label: "Profile", short: "Profile" },
];

function StudioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { format, isNigeria, currency, ready: currencyReady } = useCurrency();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab: TabId =
    tabParam === "mirror" || tabParam === "profile" || tabParam === "tryon"
      ? tabParam
      : "tryon";
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    if (tabParam === "mirror" || tabParam === "profile" || tabParam === "tryon") {
      setTab(tabParam);
    }
  }, [tabParam]);

  function goTab(id: TabId) {
    setTab(id);
    const url = id === "tryon" ? "/studio" : `/studio?tab=${id}`;
    router.replace(url, { scroll: false });
  }

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/studio");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, credits, plan, mirror_addon")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        try {
          sessionStorage.setItem(
            "tryyon_auth",
            JSON.stringify({ userId: data.id, credits: data.credits })
          );
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("profile-credits")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const updated = payload.new as Profile;
          setProfile((prev) =>
            prev && prev.id === updated.id
              ? { ...prev, credits: updated.credits, plan: updated.plan }
              : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  async function handleSpend(amount: number, reason = "tryon_snapshot") {
    if (!profile || profile.credits < amount) return false;

    const res = await fetch("/api/credits/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    setProfile((p) => {
      if (!p) return p;
      const next = { ...p, credits: data.credits };
      try {
        sessionStorage.setItem(
          "tryyon_auth",
          JSON.stringify({ userId: next.id, credits: next.credits })
        );
      } catch {
        /* ignore */
      }
      return next;
    });
    return true;
  }

  async function startPayment(packId: string) {
    setPaying(packId);
    try {
      const res = await fetch("/api/flutterwave/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, currency }),
      });
      const data = await res.json();
      if (data.payment_link) {
        window.location.href = data.payment_link;
      } else {
        alert(data.error || "Could not start payment");
      }
    } catch {
      alert("Payment failed to start");
    } finally {
      setPaying(null);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="text-ink-400 text-sm">Loading your studio…</div>
      </div>
    );
  }

  if (!profile) return null;

  const planLabel =
    profile.plan === "vendor"
      ? "Vendor"
      : profile.plan === "shopper"
        ? "Shopper"
        : "Free";

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTopUp(true)}
              className="relative flex items-center gap-2 rounded-full bg-ink-900 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-white hover:bg-ink-800 transition"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-thread-500">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-ink-900" />
              </span>
              <span className="tabular-nums">{profile.credits}</span>
              <span className="hidden text-xs font-normal text-ink-300 sm:inline">
                credits
              </span>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="text-sm font-medium text-ink-500 hover:text-ink-900 transition px-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
            Your try-on studio
          </h1>
          <p className="mt-1 text-ink-500 text-sm">
            Welcome{profile.full_name ? `, ${profile.full_name}` : ""}. You have{" "}
            <strong className="text-ink-800">{profile.credits} credits</strong>
            {" · "}
            <span className="capitalize">{planLabel}</span> plan.
          </p>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Studio sections"
          className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-1.5 shadow-sm"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => goTab(t.id)}
                className={`flex-1 min-w-[6.5rem] rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-ink-900 text-white shadow-sm"
                    : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                }`}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        {tab === "tryon" && (
          <div role="tabpanel" className="rounded-3xl overflow-hidden border border-ink-100 bg-ink-950">
            <TryOnStudio
              credits={profile.credits}
              plan={profile.plan}
              onSpend={handleSpend}
              onCreditsUpdate={(credits) =>
                setProfile((p) => (p ? { ...p, credits } : p))
              }
              hideRealtime
            />
          </div>
        )}

        {tab === "mirror" && (
          <div role="tabpanel" className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-600">
              Premium live try-on (Vendor plan or Mirror add-on). Standard{" "}
              <strong className="text-ink-900">{CREDIT_COSTS.realtime_15s} credits</strong>
              {" · "}
              Fast mode{" "}
              <strong className="text-ink-900">{CREDIT_COSTS.realtime_fast_15s} credits</strong>
              {" · "}
              15s cap. Allow camera access when prompted.
            </div>
            <RealtimeMirror
              credits={profile.credits}
              plan={profile.plan}
              mirrorAddon={!!profile.mirror_addon}
              onSpend={async (amount, reason) => handleSpend(amount, reason)}
            />
          </div>
        )}

        {tab === "profile" && (
          <div role="tabpanel" className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-ink-100 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-ink-900">Account</h2>
              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Full name
                  </dt>
                  <dd className="mt-1 text-ink-900">
                    {profile.full_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-ink-900">{profile.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Plan
                  </dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1 text-sm font-semibold text-ink-800">
                      {planLabel}
                    </span>
                    {profile.plan === "free" && (
                      <p className="mt-2 text-sm text-ink-500">
                        Free results include a watermark. Upgrade for clean exports and clips.
                      </p>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Credit balance
                  </dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-bold tabular-nums text-ink-900">
                      {profile.credits}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTopUp(true)}
                      className="rounded-full bg-thread-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-thread-400 transition"
                    >
                      Top up
                    </button>
                  </dd>
                </div>
              </dl>

              <div className="mt-8 border-t border-ink-100 pt-6">
                <h3 className="text-sm font-semibold text-ink-900">Credit costs</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-600">
                  <li className="flex justify-between gap-4">
                    <span>Snapshot try-on</span>
                    <span className="font-medium text-ink-900">
                      {CREDIT_COSTS.snapshot} credits
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>5-second clip</span>
                    <span className="font-medium text-ink-900">
                      {CREDIT_COSTS.clip} credits
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Realtime mirror (15s)</span>
                    <span className="font-medium text-ink-900">
                      {CREDIT_COSTS.realtime_15s} credits
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-ink-900">Quick actions</h3>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => goTab("tryon")}
                    className="rounded-xl border border-ink-150 px-4 py-3 text-left text-sm font-medium text-ink-800 hover:border-thread-400 hover:bg-thread-50 transition"
                  >
                    Open snapshot try-on
                  </button>
                  <button
                    type="button"
                    onClick={() => goTab("mirror")}
                    className="rounded-xl border border-ink-150 px-4 py-3 text-left text-sm font-medium text-ink-800 hover:border-thread-400 hover:bg-thread-50 transition"
                  >
                    Open realtime mirror
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTopUp(true)}
                    className="rounded-xl border border-ink-150 px-4 py-3 text-left text-sm font-medium text-ink-800 hover:border-thread-400 hover:bg-thread-50 transition"
                  >
                    Buy credits
                  </button>
                  <a
                    href="/merchant"
                    className="rounded-xl border border-ink-150 px-4 py-3 text-left text-sm font-medium text-ink-800 hover:border-thread-400 hover:bg-thread-50 transition"
                  >
                    Merchant embed dashboard
                  </a>
                </div>
              </div>

              <div className="rounded-2xl bg-ink-900 p-6 text-white">
                <h3 className="font-semibold">Need more power?</h3>
                <p className="mt-2 text-sm text-ink-300">
                  Shopper and Vendor plans unlock more monthly credits and cleaner exports.
                </p>
                <Link
                  href="/#pricing"
                  className="mt-4 inline-flex rounded-full bg-thread-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-thread-400 transition"
                >
                  View plans
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Top-up modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink-950/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
              <h2 className="font-semibold text-ink-900">Top up credits</h2>
              <button
                type="button"
                onClick={() => setShowTopUp(false)}
                className="text-ink-400 hover:text-ink-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              {currencyReady && (
                <p className="text-xs text-ink-400 mb-1">
                  Charged in {isNigeria ? "Nigerian Naira (₦)" : "US Dollars ($)"}
                </p>
              )}
              {CREDIT_PACKS.map((pack) => {
                const amount = packPrice(pack, isNigeria);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => startPayment(pack.id)}
                    disabled={!!paying}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition hover:border-thread-400 ${
                      "popular" in pack && pack.popular
                        ? "border-thread-500 bg-thread-50"
                        : "border-ink-150"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-ink-900">{pack.label}</p>
                      <p className="text-xs text-ink-500">{format(amount)}</p>
                    </div>
                    <span className="text-sm font-medium text-thread-600">
                      {paying === pack.id ? "Redirecting…" : "Buy"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="px-5 pb-5 text-xs text-ink-400 text-center">
              Secure payment powered by Flutterwave
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ink-50 flex items-center justify-center">
          <div className="text-ink-400 text-sm">Loading your studio…</div>
        </div>
      }
    >
      <StudioInner />
    </Suspense>
  );
}
