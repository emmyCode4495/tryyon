"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import TryOnStudio from "@/components/TryOnStudio";
import { CREDIT_PACKS } from "@/lib/credits";
import Logo from "@/components/Logo";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  credits: number;
  plan: string;
};

export default function StudioPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

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
        .select("id, email, full_name, credits, plan")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    }

    load();

    // Realtime credit updates
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

  async function handleSpend(amount: number) {
    if (!profile || profile.credits < amount) return false;

    const res = await fetch("/api/credits/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason: "tryon_snapshot" }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    setProfile((p) => (p ? { ...p, credits: data.credits } : p));
    return true;
  }

  async function startPayment(packId: string) {
    setPaying(packId);
    try {
      const res = await fetch("/api/flutterwave/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
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

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <button
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
              onClick={signOut}
              className="text-sm font-medium text-ink-500 hover:text-ink-900 transition px-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
            Your try-on studio
          </h1>
          <p className="mt-1 text-ink-500 text-sm">
            Welcome{profile.full_name ? `, ${profile.full_name}` : ""}. You have{" "}
            <strong className="text-ink-800">{profile.credits} credits</strong>.
          </p>
        </div>

        <TryOnStudio
          credits={profile.credits}
          onSpend={handleSpend}
        />
      </main>

      {/* Top-up modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink-950/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
              <h2 className="font-semibold text-ink-900">Top up credits</h2>
              <button
                onClick={() => setShowTopUp(false)}
                className="text-ink-400 hover:text-ink-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.id}
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
                    <p className="text-xs text-ink-500">
                      ₦{pack.amountNgn.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-thread-600">
                    {paying === pack.id ? "Redirecting…" : "Buy"}
                  </span>
                </button>
              ))}
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
