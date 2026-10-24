"use client";

import { useState } from "react";
import { BlazerGarment, FormBase } from "./Garments";
import { CloseIcon, UserIcon } from "./icons";

/** A product page with try-on embedded. The widget opens on click. */
function StoreMock() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl bg-white text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-1.5 border-b border-ink-100 px-4 py-3" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="ml-3 flex-1 truncate rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-500">
            yourstore.com/products/everyday-blazer
          </span>
        </div>

        <div className="grid grid-cols-5 gap-4 p-4 sm:gap-5 sm:p-5">
          <div className="relative col-span-3 aspect-[3/4] overflow-hidden rounded-xl bg-ink-100">
            <FormBase className="absolute inset-0 h-full w-full" />
            <BlazerGarment className="absolute inset-0 h-full w-full" />

            {/* Embedded try-on widget */}
            <div
              inert={!open}
              className={`absolute inset-2 flex origin-bottom-right flex-col rounded-xl bg-white p-3 shadow-xl transition duration-500 ease-[var(--ease-out)] ${
                open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold">Try it on</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close try-on"
                  className="grid h-6 w-6 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-ink-300 text-center">
                <UserIcon className="h-6 w-6 text-ink-500" />
                <span className="px-2 text-xs font-medium text-ink-700">Add your photo</span>
              </div>
              <button
                type="button"
                className="mt-2 h-8 rounded-full bg-chalk-500 text-xs font-semibold text-white"
              >
                Try on
              </button>
            </div>
          </div>

          <div className="col-span-2 flex flex-col">
            <p className="font-display text-base font-semibold leading-tight">Everyday blazer</p>
            <p className="mt-1 text-sm text-ink-600">$120</p>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {["S", "M", "L"].map((s, i) => (
                <span
                  key={s}
                  className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${
                    i === 1 ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-auto space-y-2 pt-4">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                className="h-10 w-full rounded-full bg-chalk-500 text-xs font-semibold text-white transition duration-200 hover:bg-chalk-600 active:scale-[0.97]"
              >
                Try it on
              </button>
              <button
                type="button"
                className="h-10 w-full rounded-full border border-ink-200 text-xs font-semibold text-ink-900"
              >
                Add to bag
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-ink-300">Tap “Try it on” to see the shopper’s view.</p>
    </div>
  );
}

export default function ForBrands() {
  return (
    <section id="for-brands" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] bg-ink-900 text-white sm:rounded-[2.5rem]">
          <div className="grid items-center gap-14 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16 lg:p-16">
            <div>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Built for fashion brands
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-300">
                Embed try-on on your product pages. Increase conversion and reduce returns with
                realistic virtual fitting.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="h-13 rounded-full bg-chalk-500 px-8 text-base font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-chalk-400 active:translate-y-0 active:scale-[0.98]"
                >
                  Talk to us
                </button>
                <button
                  type="button"
                  className="h-13 rounded-full border border-white/25 px-8 text-base font-semibold text-white transition duration-300 hover:bg-white/10 active:scale-[0.98]"
                >
                  View documentation
                </button>
              </div>
            </div>

            <StoreMock />
          </div>
        </div>
      </div>
    </section>
  );
}
