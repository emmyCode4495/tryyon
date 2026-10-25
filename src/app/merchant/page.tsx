"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

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

function appOrigin() {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env && !env.includes("localhost")) return env;
  if (typeof window !== "undefined") {
    const o = window.location.origin;
    if (!o.includes("localhost")) return o;
  }
  return "https://www.tryyon.store";
}

function buildSnippet(slug: string) {
  const origin = appOrigin();
  return `<iframe
  src="${origin}/embed?merchant=${slug}&garment=YOUR_PRODUCT_IMAGE_URL&product_id=SKU123"
  style="width:100%;max-width:420px;height:640px;border:0;border-radius:16px"
  allow="camera"
  title="tryyON virtual try-on"
></iframe>`;
}

export default function MerchantDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snippet, setSnippet] = useState("");
  const [copied, setCopied] = useState(false);

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
        .select("id, name, slug, credits_balance, monthly_allowance, primary_color")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (m) {
        setMerchant(m);
        setSnippet(buildSnippet(m.slug));
        const { data: u } = await supabase
          .from("merchant_usage")
          .select("id, event, credits, created_at, meta")
          .eq("merchant_id", m.id)
          .order("created_at", { ascending: false })
          .limit(50);
        setUsage((u as UsageRow[]) || []);
      }
      setLoading(false);
    })();
  }, [router]);

  async function createMerchant(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const clean = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);

    const { data, error: err } = await supabase
      .from("merchants")
      .insert({
        owner_user_id: user.id,
        name: name.trim() || "My store",
        slug: clean,
        credits_balance: 500,
        monthly_allowance: 500,
      })
      .select("id, name, slug, credits_balance, monthly_allowance, primary_color")
      .single();

    setCreating(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMerchant(data);
    setSnippet(buildSnippet(data.slug));
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-ink-400 text-sm">
        Loading merchant dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/studio" className="text-sm font-medium text-ink-600 hover:text-ink-900">
            Studio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink-900">Merchant embed</h1>
        <p className="mt-1 text-sm text-ink-500">
          Add virtual try-on to your product pages. Each try-on uses your merchant credit allowance.
        </p>

        {!merchant ? (
          <form
            onSubmit={createMerchant}
            className="mt-8 max-w-md space-y-4 rounded-2xl border border-ink-100 bg-white p-6"
          >
            <h2 className="font-semibold text-ink-900">Create store</h2>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="text-sm text-ink-600">Store name</label>
              <input
                className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Fashion"
                required
              />
            </div>
            <div>
              <label className="text-sm text-ink-600">Slug (URL key)</label>
              <input
                className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme-fashion"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="h-11 w-full rounded-full bg-ink-900 text-sm font-semibold text-white"
            >
              {creating ? "Creating…" : "Create merchant account"}
            </button>
          </form>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-ink-100 bg-white p-6">
                <h2 className="font-semibold text-ink-900">{merchant.name}</h2>
                <p className="text-sm text-ink-500">slug: {merchant.slug}</p>
                <p className="mt-4 text-3xl font-bold tabular-nums text-ink-900">
                  {merchant.credits_balance}
                </p>
                <p className="text-xs text-ink-500">
                  credits left · allowance {merchant.monthly_allowance}/mo
                </p>
              </div>
              <div className="rounded-2xl border border-ink-100 bg-white p-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-900">Embed snippet</h3>
                  <button
                    type="button"
                    onClick={copySnippet}
                    className="text-xs font-semibold text-chalk-600 hover:text-chalk-700"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-ink-950 p-4 text-[11px] text-ink-100 whitespace-pre-wrap">
                  {snippet}
                </pre>
                <p className="mt-2 text-xs text-ink-500">
                  Replace <code className="text-ink-700">YOUR_PRODUCT_IMAGE_URL</code> with the
                  garment image URL on each product page.
                </p>
              </div>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-ink-100 bg-white p-6">
              <h3 className="font-semibold text-ink-900">Recent usage</h3>
              {usage.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No embed try-ons yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-ink-100">
                  {usage.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-ink-800">{u.event}</p>
                        <p className="text-xs text-ink-400">
                          {new Date(u.created_at).toLocaleString()}
                          {u.meta?.product_id ? ` · ${u.meta.product_id}` : ""}
                        </p>
                      </div>
                      <span className="tabular-nums text-ink-600">−{u.credits}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
