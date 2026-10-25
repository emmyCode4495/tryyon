"use client";

import { useEffect, useState } from "react";
import OtpInput from "./OtpInput";
import { CheckIcon } from "@/components/icons";

type Props = {
  /** When set, the email is fixed (profile page) and the first step is just "send code". */
  email?: string;
  /** Label for the button on the success screen. */
  doneLabel?: string;
  onDone?: () => void;
};

type Step = "email" | "code" | "done";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function PasswordResetFlow({ email: lockedEmail, doneLabel = "Done", onDone }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (lockedEmail) setEmail(lockedEmail);
  }, [lockedEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const fail = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await post("/api/auth/password-otp/request", { email });
    setBusy(false);
    if (!ok) {
      if (typeof data.retryAfter === "number") {
        setCooldown(data.retryAfter);
        // They already have a code from a moment ago: let them enter it
        setStep("code");
      }
      fail(data.error || "Couldn't send the code. Please try again.");
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(typeof data.cooldown === "number" ? data.cooldown : 60);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (code.length < 6) return fail("Enter the 6-digit code from your email.");
    if (password.length < 8) return fail("Use at least 8 characters for your new password.");
    if (password !== confirm) return fail("The two passwords don't match.");

    setBusy(true);
    setError(null);
    const { ok, data } = await post("/api/auth/password-otp/verify", { email, code, password });
    setBusy(false);
    if (!ok) {
      fail(data.error || "Couldn't reset your password. Please try again.");
      if (data.attemptsLeft === 0) setCode("");
      return;
    }
    setStep("done");
  }

  const errorBox = error && (
    <p key={errorKey} role="alert" className="shake rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </p>
  );

  if (step === "done") {
    return (
      <div className="pane-in py-2 text-center">
        <span className="pop-check mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white">
          <CheckIcon className="h-7 w-7" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-ink-900">Password updated</p>
        <p className="mt-1 text-sm text-ink-600">You can use your new password next time you sign in.</p>
        <button type="button" onClick={onDone} className="btn-primary mt-6 h-11 w-full rounded-full text-sm font-semibold">
          {doneLabel}
        </button>
      </div>
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="pane-in space-y-5">
        {errorBox}
        {lockedEmail ? (
          <p className="text-sm text-ink-600">
            We&rsquo;ll email a 6-digit code to <span className="font-semibold text-ink-900">{lockedEmail}</span> to
            confirm it&rsquo;s you.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Email</span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
        )}
        <button type="submit" disabled={busy || !email} className="btn-primary h-11 w-full rounded-full text-sm font-semibold">
          {busy ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="pane-in space-y-5">
      <p className="text-center text-sm text-ink-600">
        We sent a code to <span className="font-semibold text-ink-900">{email}</span>. It expires in 10 minutes.
      </p>

      {errorBox}

      <div key={errorKey}>
        <OtpInput value={code} onChange={setCode} disabled={busy} invalid={!!error} autoFocus />
      </div>

      <div className="text-center text-sm">
        {cooldown > 0 ? (
          <span className="text-ink-500">Resend code in {cooldown}s</span>
        ) : (
          <button type="button" onClick={() => sendCode()} disabled={busy} className="font-semibold text-chalk-600 hover:text-chalk-700">
            Send a new code
          </button>
        )}
      </div>

      <div className="space-y-4 border-t border-ink-100 pt-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">New password</span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="field pr-16"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">Confirm new password</span>
          <input
            type={show ? "text" : "password"}
            required
            autoComplete="new-password"
            className="field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy || code.length < 6 || !password || !confirm}
        className="btn-primary h-11 w-full rounded-full text-sm font-semibold"
      >
        {busy ? "Updating…" : "Update password"}
      </button>

      {!lockedEmail && (
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError(null);
            setCode("");
          }}
          className="block w-full text-center text-sm text-ink-500 hover:text-ink-900"
        >
          Use a different email
        </button>
      )}
    </form>
  );
}
