"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { GoogleIcon } from "@/components/icons";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
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

    // If email confirmation is disabled, session exists — hard nav so cookies stick
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      window.location.assign("/studio");
    } else {
      setError("Check your email to confirm your account, then sign in.");
    }
  }

  async function signUpWithGoogle() {
    setError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/studio`,
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
              Create your account
            </h1>
            <p className="mt-2 text-ink-500 text-sm">
              Get 2 free credits — enough for one try-on
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 sm:p-8 space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            {/* Google Sign-Up */}
            <button
              type="button"
              onClick={signUpWithGoogle}
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
                <span className="bg-white px-3 text-ink-400">or sign up with email</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
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
                disabled={loading || googleLoading}
                className="w-full rounded-xl bg-ink-900 text-white font-semibold py-3.5 text-sm hover:bg-ink-800 disabled:opacity-50 transition"
              >
                {loading ? "Creating account…" : "Sign up — get 2 free credits"}
              </button>

              <p className="text-xs text-ink-400 text-center">
                By signing up you agree to our Terms and Privacy Policy.
              </p>
            </form>
          </div>

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
