"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { cssVars } from "@/lib/css";
import { appOrigin, snippetLines } from "@/lib/embed";
import { FormBase, TeeGarment } from "@/components/Garments";
import CodeLines from "./CodeLines";

const STAGES = [
  {
    title: "Copy your snippet",
    body: "One iframe, already tied to your store. Pick a product and colour below and it updates.",
    ms: 4800,
  },
  {
    title: "Paste it into a product page",
    body: "Drop it where the try-on should sit. Works in Shopify, WooCommerce, Webflow or plain HTML.",
    ms: 5400,
  },
  {
    title: "Shoppers try it on",
    body: "They add a photo, the garment is fitted in seconds, and each try-on costs you 2 credits.",
    ms: 9000,
  },
] as const;

function PauseIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M4 2.8v10.4a.6.6 0 0 0 .92.5l8.2-5.2a.6.6 0 0 0 0-1L4.92 2.3A.6.6 0 0 0 4 2.8Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <rect x="3" y="2.5" width="3.4" height="11" rx="1" />
      <rect x="9.6" y="2.5" width="3.4" height="11" rx="1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Pane 1: select the snippet and press Copy                          */
/* ------------------------------------------------------------------ */
function CopyPane({ lines }: { lines: string[] }) {
  return (
    <div className="pane-in flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-xs text-ink-300">Your embed snippet</span>
        <span className="demo-copybtn relative inline-flex h-7 items-center rounded-full bg-chalk-500 px-3 text-xs font-semibold text-white">
          <span className="demo-copy-a">Copy</span>
          <span className="demo-copy-b absolute inset-0 flex items-center justify-center gap-1">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="m3 8.5 3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copied
          </span>
        </span>
      </div>
      <div className="code-select flex-1 overflow-hidden px-3 py-4">
        <CodeLines lines={lines} dropDelay={0.35} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pane 2: snippet drops into the product page source                 */
/* ------------------------------------------------------------------ */
const BEFORE = [
  '<main class="product">',
  "  <h1>Linen tee</h1>",
  '  <p class="price">$48</p>',
  '  <button id="add">Add to cart</button>',
  "",
  "  <!-- tryyON try-on goes here -->",
];
const AFTER = ["</main>"];

function PastePane({ lines }: { lines: string[] }) {
  return (
    <div className="pane-in flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-thread-500" aria-hidden="true" />
        <span className="font-mono text-xs text-ink-300">product-page.html</span>
      </div>
      <div className="flex-1 overflow-hidden px-3 py-4">
        <CodeLines lines={BEFORE} hot={[]} />
        <div className="code-new relative">
          <CodeLines lines={lines} drop dropDelay={0.5} start={BEFORE.length + 1} />
        </div>
        <CodeLines lines={AFTER} hot={[]} start={BEFORE.length + lines.length + 1} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pane 3: the live storefront                                        */
/* ------------------------------------------------------------------ */
function LivePane() {
  return (
    <div className="pane-in flex h-full flex-col bg-ink-50">
      <div className="flex items-center gap-3 border-b border-ink-200 bg-white px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <i className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <i className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-full bg-ink-100 px-3 py-1 text-[11px] text-ink-500">
          yourstore.com/products/linen-tee
        </span>
      </div>

      <div className="relative grid flex-1 grid-cols-2 gap-3 overflow-hidden p-3 sm:gap-5 sm:p-5">
        {/* The existing product page */}
        <div className="flex flex-col">
          <div className="grid flex-1 place-items-center rounded-2xl bg-white">
            <TeeGarment className="h-full max-h-48 w-full" />
          </div>
          <p className="mt-3 font-display text-sm font-semibold text-ink-900 sm:text-base">Linen tee</p>
          <p className="text-xs text-ink-500">$48</p>
          <span className="mt-2 inline-flex h-8 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
            Add to cart
          </span>
        </div>

        {/* The embed, running inside it */}
        <div className="demo-slot relative flex flex-col rounded-2xl border-2 border-dashed border-chalk-400 p-2">
          <span className="demo-slot-tag absolute -top-2.5 left-3 rounded-full bg-chalk-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Your embed
          </span>
          <div className="demo-widget flex flex-1 flex-col rounded-xl bg-white p-2 shadow-[0_14px_30px_-18px_rgba(19,24,69,0.5)]">
            <div className="flex items-center justify-between text-[9px] text-ink-400">
              <span className="font-semibold text-ink-600">Virtual try-on</span>
              <span>Powered by tryyON</span>
            </div>
            <div className="mirror-glass relative mt-2 flex-1 overflow-hidden rounded-lg">
              <FormBase className="demo-photo absolute inset-0 h-full w-full" />
              <div className="demo-reveal absolute inset-0">
                <TeeGarment className="h-full w-full" />
              </div>
              <div className="demo-scan" aria-hidden="true" />
            </div>
            <span className="demo-tryon mt-2 inline-flex h-8 items-center justify-center rounded-full bg-chalk-500 text-xs font-semibold text-white">
              Try on
            </span>
          </div>

          <span className="demo-credit absolute -bottom-3 right-2 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-lg">
            −2 credits
          </span>
        </div>

        <div className="demo-toast pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-max max-w-[90%] rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-ink-700 shadow-[0_10px_30px_-10px_rgba(19,24,69,0.5)]">
          Your shopper just tried on Linen tee
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guide                                                              */
/* ------------------------------------------------------------------ */
export default function EmbedGuide({ slug }: { slug: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  const [stage, setStage] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const full = snippetLines({ slug });
  // The long src line is shortened in the demo so the key part stays on screen
  const demoLines = full.map((l, i) =>
    i === 1 ? `  src="${appOrigin()}/embed?merchant=${slug}&…"` : l
  );

  const go = (i: number) => {
    setStage(i);
    setCycle((c) => c + 1);
  };

  const advance = () => go((stage + 1) % STAGES.length);

  return (
    <div
      ref={ref}
      data-live={inView}
      data-paused={paused}
      className="embed-guide grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-12"
    >
      {/* Steps */}
      <ol className="relative space-y-1">
        {STAGES.map((s, i) => {
          const state = i < stage ? "done" : i === stage ? "active" : "idle";
          return (
            <li key={s.title} className="relative">
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  data-state={state}
                  className="guide-thread absolute left-[19px] top-11 h-[calc(100%-1.5rem)] border-l-2 border-dashed"
                />
              )}
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={state === "active" ? "step" : undefined}
                className="group relative flex w-full gap-4 rounded-2xl p-2 text-left"
              >
                <span
                  data-state={state}
                  className="guide-node grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-base font-semibold"
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                      <path d="m3 8.5 3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0 flex-1 pb-3">
                  <span
                    data-state={state}
                    className="guide-title block font-display text-lg font-semibold leading-snug"
                  >
                    {s.title}
                  </span>
                  <span className="collapse-y" data-open={state === "active"}>
                    <span className="block">
                      <span className="mt-1 block max-w-sm text-sm leading-relaxed text-ink-600">
                        {s.body}
                      </span>
                      <span className="mt-3 block h-[3px] overflow-hidden rounded-full bg-ink-200">
                        {state === "active" && (
                          <span
                            key={`${stage}-${cycle}`}
                            onAnimationEnd={(e) => {
                              if (e.target === e.currentTarget && !reduced) advance();
                            }}
                            className="guide-bar block h-full origin-left rounded-full bg-chalk-500"
                            style={cssVars({ "--dur": `${s.ms}ms` })}
                          />
                        )}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Stage */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 -translate-x-3 translate-y-3 rounded-[28px] border-2 border-dashed border-ink-300"
        />
        <div
          role="img"
          aria-label="Animated walkthrough: copy the embed snippet, paste it into a product page, then shoppers upload a photo and see the garment fitted onto them."
          className="relative h-[24rem] overflow-hidden rounded-[24px] bg-ink-950 shadow-[0_40px_80px_-40px_rgba(19,24,69,0.7)] sm:h-[27rem]"
        >
          <div key={`${stage}-${cycle}`} className="h-full">
            {stage === 0 && <CopyPane lines={demoLines} />}
            {stage === 1 && <PastePane lines={demoLines} />}
            {stage === 2 && <LivePane />}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? "Play walkthrough" : "Pause walkthrough"}
          className="absolute -bottom-3 right-4 inline-flex h-9 items-center gap-2 rounded-full bg-white px-3.5 text-xs font-semibold text-ink-700 shadow-[0_10px_30px_-10px_rgba(19,24,69,0.5)] transition-transform hover:-translate-y-0.5"
        >
          <PauseIcon paused={paused} />
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </div>
  );
}
