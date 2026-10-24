"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/studio`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is disabled in Supabase, user is logged in immediately
    router.push("/studio");
    router.refresh();
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
              Create your account
            </h1>
            <p className="mt-2 text-ink-500 text-sm">
              Get 10 free credits to start trying on clothes
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 sm:p-8 space-y-5"
          >
            {error && (
              <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink-700 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm outline-none focus:border-thread-500 focus:ring-2 focus:ring-thread-500/20 transition"
                placeholder="Ada Okonkwo"
              />
            </div>

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
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm outline-none focus:border-thread-500 focus:ring-2 focus:ring-thread-500/20 transition"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-ink-900 text-white font-semibold py-3.5 text-sm hover:bg-ink-800 disabled:opacity-50 transition"
            >
              {loading ? "Creating account…" : "Sign up — get 10 free credits"}
            </button>

            <p className="text-xs text-ink-400 text-center">
              By signing up you agree to our Terms and Privacy Policy.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-thread-600 hover:text-thread-700">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
