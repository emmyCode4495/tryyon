"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { GoogleIcon } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/studio";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Hard navigation so middleware + server see the new session cookies
    const dest = next.startsWith("/") ? next : "/studio";
    if (data.session) {
      window.location.assign(dest);
    } else {
      router.push(dest);
      router.refresh();
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // On success, browser redirects to Google → then back to /auth/callback
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <header className="px-4 sm:px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
              Welcome back
            </h1>
            <p className="mt-2 text-ink-500 text-sm">
              Sign in to continue to your try-on studio
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 sm:p-8 space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white py-3.5 text-sm font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-50 transition"
            >
              <GoogleIcon className="h-5 w-5 shrink-0" />
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-ink-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-ink-400">or sign in with email</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm outline-none focus:border-thread-500 focus:ring-2 focus:ring-thread-500/20 transition"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm outline-none focus:border-thread-500 focus:ring-2 focus:ring-thread-500/20 transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-xl bg-ink-900 text-white font-semibold py-3.5 text-sm hover:bg-ink-800 disabled:opacity-50 transition"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-thread-600 hover:text-thread-700">
              Sign up free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-50" />}>
      <LoginForm />
    </Suspense>
  );
}
