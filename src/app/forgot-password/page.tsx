"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PasswordResetFlow from "@/components/auth/PasswordResetFlow";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="px-4 py-5 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="rise mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Reset your password</h1>
            <p className="mt-2 text-sm text-ink-500">We&rsquo;ll email you a 6-digit code to set a new one</p>
          </div>

          <div className="rise rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8" style={{ animationDelay: "0.08s" }}>
            <PasswordResetFlow doneLabel="Back to sign in" onDone={() => router.push("/login?reset=1")} />
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-thread-600 hover:text-thread-700">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
