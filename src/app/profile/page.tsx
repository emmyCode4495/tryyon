"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import Logo from "@/components/Logo";
import PasswordResetFlow from "@/components/auth/PasswordResetFlow";

type Profile = {
  full_name: string | null;
  email: string | null;
  credits: number;
  plan: string;
};

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  shopper: "Shopper",
  vendor: "Vendor",
  brand: "Brand",
};

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-ink-50" aria-busy="true" aria-label="Loading profile">
      <div className="h-14 border-b border-ink-100 bg-white" />
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-12">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-32 rounded-3xl" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [updated, setUpdated] = useState(false);
  // Remounting the flow gives a clean form every time it's reopened
  const [flowKey, setFlowKey] = useState(0);
  const credits = useAnimatedNumber(profile?.credits ?? 0, 900);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/profile");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, credits, plan")
        .eq("id", user.id)
        .maybeSingle();

      setProfile({
        full_name: data?.full_name || (user.user_metadata?.full_name as string | undefined) || null,
        email: data?.email || user.email || null,
        credits: data?.credits ?? 0,
        plan: data?.plan ?? "free",
      });
      setLoading(false);
    })();
  }, [router]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading || !profile) return <ProfileSkeleton />;

  const initial = (profile.full_name || profile.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/studio" className="link-u text-ink-600 hover:text-ink-900">
              Studio
            </Link>
            <button type="button" onClick={signOut} className="link-u text-ink-600 hover:text-ink-900">
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="rise font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
          Your profile
        </h1>

        <section
          aria-label="Account"
          className="rise mt-8 rounded-3xl border border-ink-100 bg-white p-6 sm:p-8"
          style={{ animationDelay: "0.08s" }}
        >
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-chalk-500 font-display text-xl font-semibold text-white"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-ink-900">
                {profile.full_name || "Your account"}
              </p>
              <p className="truncate text-sm text-ink-500">{profile.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-100 pt-6">
            <div>
              <dt className="text-sm text-ink-500">Credits</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-ink-900">{credits}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-500">Plan</dt>
              <dd className="font-display text-2xl font-semibold text-ink-900">
                {PLAN_LABEL[profile.plan] ?? profile.plan}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="password-heading"
          className="rise mt-5 rounded-3xl border border-ink-100 bg-white p-6 sm:p-8"
          style={{ animationDelay: "0.16s" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="password-heading" className="font-display text-xl font-semibold text-ink-900">
                Password
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                Change it, or set one if you usually sign in with Google.
              </p>
            </div>
            {!open && (
              <button
                type="button"
                onClick={() => {
                  setUpdated(false);
                  setFlowKey((k) => k + 1);
                  setOpen(true);
                }}
                className="btn-primary h-10 shrink-0 rounded-full px-5 text-sm font-semibold"
              >
                Change password
              </button>
            )}
          </div>

          {updated && !open && (
            <p role="status" className="pane-in mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Password updated.
            </p>
          )}

          <div className="collapse-y" data-open={open}>
            <div>
              <div className="pt-6" inert={!open}>
                {profile.email && (
                  <PasswordResetFlow
                    key={flowKey}
                    email={profile.email}
                    doneLabel="Done"
                    onDone={() => {
                      setUpdated(true);
                      setOpen(false);
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 block w-full text-center text-sm text-ink-500 hover:text-ink-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
