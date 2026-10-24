import HeroMirror from "./HeroMirror";
import { cssVars } from "@/lib/css";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-12 sm:px-6 sm:pb-32 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pt-20">
        <div>
          <h1 className="font-display text-[clamp(3rem,8.4vw,6.25rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-ink-900">
            <span className="line">
              <span style={cssVars({ "--d": "0.05s" })}>Try it on</span>
            </span>
            <span className="line">
              <span style={cssVars({ "--d": "0.15s" })}>before it’s</span>
            </span>
            <span className="line">
              <span style={cssVars({ "--d": "0.25s" })}>yours.</span>
            </span>
          </h1>

          <p
            className="rise mt-8 max-w-md text-lg leading-relaxed text-ink-600 sm:text-xl"
            style={cssVars({ "--d": "0.5s" })}
          >
            Upload a photo of yourself and any garment, and see it on you in
            seconds. Made for shoppers, vendors and fashion brands.
          </p>

          <div
            className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={cssVars({ "--d": "0.62s" })}
          >
            <a
              href="/signup"
              className="inline-flex h-13 items-center justify-center rounded-full bg-chalk-500 px-8 text-base font-semibold text-white shadow-[0_14px_32px_-12px_rgba(76,92,255,0.85)] transition duration-300 hover:-translate-y-0.5 hover:bg-chalk-600 active:translate-y-0 active:scale-[0.98]"
            >
              Start a try-on
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-13 items-center justify-center rounded-full border border-ink-300 px-8 text-base font-semibold text-ink-900 transition duration-300 hover:border-ink-900 hover:bg-white active:scale-[0.98]"
            >
              See how it works
            </a>
          </div>

          <p
            className="rise mt-5 text-sm text-ink-600"
            style={cssVars({ "--d": "0.72s" })}
          >
            Start with 10 free credits.
          </p>
        </div>

        <HeroMirror />
      </div>
    </section>
  );
}
