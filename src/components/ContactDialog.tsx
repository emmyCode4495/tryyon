"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "./icons";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@tryyon.store";

export type ContactDialogHandle = { open: () => void };

/**
 * "Talk to us" sheet. There's no backend inbox for brand enquiries yet, so
 * submitting opens the visitor's email app with everything pre-filled.
 */
const ContactDialog = forwardRef<ContactDialogHandle>(function ContactDialog(_, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [store, setStore] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      setSent(false);
      dialogRef.current?.showModal();
    },
  }));

  const close = () => dialogRef.current?.close();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `tryyON for brands${store ? `: ${store}` : ""}`;
    const body = [
      `Hi tryyON team,`,
      "",
      message.trim() || "I'd like to learn more about embedding try-on on our product pages.",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      store ? `Store: ${store}` : "",
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="contact-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="sheet m-auto w-[min(92vw,30rem)] rounded-3xl bg-white p-0 text-ink-900 shadow-[0_40px_90px_-30px_rgba(11,14,43,0.8)]"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="contact-title" className="font-display text-2xl font-semibold tracking-tight">
              Talk to us
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              Tell us about your store and we&rsquo;ll help you set up try-on.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 transition hover:bg-ink-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="pane-in mt-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-chalk-500 text-white">
              <CheckIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold">Your email app should be open</p>
            <p className="mt-1 text-sm text-ink-600">
              Press send there to reach us. Nothing opened? Write to us directly:
            </p>
            <button
              type="button"
              onClick={copyAddress}
              className="mt-4 inline-flex h-10 items-center rounded-full bg-ink-100 px-4 text-sm font-semibold text-ink-800 transition hover:bg-ink-200"
            >
              {copied ? "Copied" : CONTACT_EMAIL}
            </button>
            <div className="mt-6">
              <button type="button" onClick={close} className="text-sm font-semibold text-chalk-600 hover:text-chalk-700">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Your name</span>
                <input className="field mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink-700">Work email</span>
                <input
                  className="field mt-1.5"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">Store or website</span>
              <input
                className="field mt-1.5"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="yourstore.com"
                autoComplete="url"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-700">What would you like to know?</span>
              <textarea
                className="field mt-1.5 min-h-24 resize-y"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Platform you use, how many products, any questions"
              />
            </label>
            <button type="submit" className="btn-primary h-11 w-full rounded-full text-sm font-semibold">
              Send message
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
});

export default ContactDialog;
