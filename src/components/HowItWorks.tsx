"use client";

import { useInView } from "@/hooks/useInView";
import { cssVars } from "@/lib/css";

const STEPS = [
  {
    title: "Upload two photos",
    body: "Your photo and the garment you want to try. Drag & drop or select from your device.",
  },
  {
    title: "Generate in seconds",
    body: "Our AI creates a realistic try-on snapshot. Uses only 2 credits.",
  },
  {
    title: "Download or share",
    body: "Save the image or turn it into a short clip for social media.",
  },
];

export default function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);

  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-ink-600">Simple, fast, and works on any connection.</p>
        </div>

        {/* The thread stitches itself from step to step as this scrolls into view */}
        <div ref={ref} data-in={inView} className="steps relative mt-16">
          <span className="thread thread-h hidden md:block" aria-hidden="true" />
          <span className="thread thread-v md:hidden" aria-hidden="true" />

          <ol className="grid gap-14 md:grid-cols-3 md:gap-10">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative pl-20 md:pl-0">
                <span
                  aria-hidden="true"
                  className="step-node absolute left-0 top-0 z-10 grid h-14 w-14 place-items-center rounded-full font-display text-xl font-semibold"
                  style={cssVars({ "--d": `${0.3 + i * 0.55}s` })}
                >
                  {i + 1}
                </span>
                <div className="md:pt-24">
                  <h3 className="font-display text-xl font-semibold text-ink-900">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs leading-relaxed text-ink-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
