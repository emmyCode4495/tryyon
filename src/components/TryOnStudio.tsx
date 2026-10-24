"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import UploadZone from "./UploadZone";
import { FormBase } from "./Garments";
import { DownloadIcon, ShareIcon, SparkIcon } from "./icons";

const SNAPSHOT_COST = 2;
const CLIP_COST = 20;

// Placeholder timing for the simulated generation. When the real endpoint is
// connected, drive `stage` from its progress instead of these timers.
const STAGES = ["Reading your pose", "Fitting the garment", "Finishing details"];
const STAGE_MS = 1100;
const TOTAL_MS = STAGE_MS * STAGES.length;

interface TryOnStudioProps {
  credits: number;
  onSpend: (amount: number) => void;
}

export default function TryOnStudio({ credits, onSpend }: TryOnStudioProps) {
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const canGenerate = !!personFile && !!garmentFile && credits >= SNAPSHOT_COST && !isGenerating;

  const handlePersonSelect = (file: File) => {
    if (personPreview) URL.revokeObjectURL(personPreview);
    setPersonFile(file);
    setPersonPreview(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const handleGarmentSelect = (file: File) => {
    if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    setGarmentFile(file);
    setGarmentPreview(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setStage(0);
    // Mutate (not reassign) so the unmount cleanup always sees every timer
    timers.current.length = 0;
    timers.current.push(
      window.setTimeout(() => setStage(1), STAGE_MS),
      window.setTimeout(() => setStage(2), STAGE_MS * 2),
      window.setTimeout(() => {
        onSpend(SNAPSHOT_COST);
        setResultUrl(personPreview);
        setIsGenerating(false);
      }, TOTAL_MS)
    );
  };

  let helper: ReactNode;
  if (isGenerating) helper = "Fitting in progress. This takes a few seconds.";
  else if (!personFile && !garmentFile) helper = "Add your photo and a garment to continue.";
  else if (!personFile) helper = "Add your photo to continue.";
  else if (!garmentFile) helper = "Add a garment to continue.";
  else if (credits < SNAPSHOT_COST)
    helper = (
      <>
        You need {SNAPSHOT_COST} credits to generate.{" "}
        <a href="#pricing" className="text-white underline underline-offset-4 hover:text-thread-400">
          See plans
        </a>
      </>
    );
  else helper = `Ready. This uses ${SNAPSHOT_COST} credits.`;

  return (
    <section id="try-on" className="studio-mat relative isolate overflow-hidden bg-ink-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Inputs */}
          <div className="lg:col-span-7">
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Create your try-on
            </h2>
            <p className="mt-4 max-w-md text-lg text-ink-300">
              Two photos is all you need. Works on any device.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6">
              <UploadZone
                label="Your photo"
                placeholder="Upload your photo"
                hint="Full-length photos work best."
                icon="person"
                onFileSelect={handlePersonSelect}
                previewUrl={personPreview}
                disabled={isGenerating}
              />
              <UploadZone
                label="Garment"
                placeholder="Upload clothing item"
                hint="One item, on a plain background."
                icon="garment"
                onFileSelect={handleGarmentSelect}
                previewUrl={garmentPreview}
                disabled={isGenerating}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate && !isGenerating}
              aria-busy={isGenerating}
              className={`relative mt-8 flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full text-base font-semibold text-white transition duration-300 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 ${
                isGenerating
                  ? "cursor-progress bg-chalk-700"
                  : "bg-chalk-500 shadow-[0_14px_36px_-14px_rgba(76,92,255,0.9)] hover:-translate-y-0.5 hover:bg-chalk-400 disabled:shadow-none disabled:hover:translate-y-0"
              }`}
            >
              {isGenerating ? (
                <>
                  <span
                    aria-hidden="true"
                    className="gen-fill absolute inset-0 origin-left bg-white/20"
                    style={{ animationDuration: `${TOTAL_MS}ms` }}
                  />
                  <span className="relative">{STAGES[stage]}…</span>
                </>
              ) : (
                <>
                  <SparkIcon className="h-5 w-5" />
                  Generate try-on · {SNAPSHOT_COST} credits
                </>
              )}
            </button>

            <p aria-live="polite" className="mt-3 min-h-5 text-sm text-ink-300">
              {helper}
            </p>
          </div>

          {/* Result */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
              <div className="mirror-frame mirror-frame--light arch p-2.5">
                <div
                  className="mirror-glass arch relative aspect-[3/4] overflow-hidden"
                  style={{ "--r": "20px" } as React.CSSProperties}
                >
                  {resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={resultUrl}
                      src={resultUrl}
                      alt="Your try-on result"
                      className="result-img absolute inset-0 h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0">
                      <FormBase className="absolute inset-0 h-full w-full opacity-60" />
                      <div className="absolute inset-x-6 bottom-8 rounded-2xl bg-white/85 px-4 py-3 text-center shadow-sm backdrop-blur">
                        <p className="font-display text-base font-semibold text-ink-900">
                          Your try-on appears here
                        </p>
                        <p className="mt-0.5 text-sm text-ink-600">
                          Add a photo and a garment to begin.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fitting-room curtains close while generating, open on the result */}
                  <div className={`curtain curtain-l ${isGenerating ? "is-closed" : ""}`} />
                  <div className={`curtain curtain-r ${isGenerating ? "is-closed" : ""}`} />

                  <div
                    aria-hidden="true"
                    className={`absolute inset-0 z-30 grid place-items-center px-6 text-center transition-opacity duration-300 ${
                      isGenerating ? "opacity-100 delay-500" : "opacity-0"
                    }`}
                  >
                    <div>
                      <div className="mx-auto mb-5 flex w-28 gap-1.5">
                        {STAGES.map((s, i) => (
                          <span
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                              i <= stage ? "bg-thread-500" : "bg-white/20"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="font-display text-xl font-medium text-white">{STAGES[stage]}</p>
                      <p className="mt-1 text-sm text-ink-300">Stay on this page</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions appear once there is a result */}
            <div className="collapse-y" data-open={!!resultUrl}>
              <div inert={!resultUrl}>
                <div className="pt-7">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Your result</h3>
                    <span className="text-sm text-ink-300">{SNAPSHOT_COST} credits used</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <a
                      href={resultUrl ?? undefined}
                      download="tryyon-result"
                      className="flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-ink-900 transition duration-200 hover:bg-ink-100 active:scale-[0.97]"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Download
                    </a>
                    <button
                      type="button"
                      className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 text-sm font-semibold text-white transition duration-200 hover:bg-white/10 active:scale-[0.97]"
                    >
                      <ShareIcon className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  <div className="mt-5 rounded-3xl border border-dashed border-white/25 p-5">
                    <p className="font-display text-base font-semibold">Want a short video?</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-300">
                      Turn this into a 5-second clip perfect for Instagram or WhatsApp Status.
                    </p>
                    <button
                      type="button"
                      className="mt-4 inline-flex h-11 items-center rounded-full bg-thread-500 px-6 text-sm font-semibold text-ink-950 transition duration-200 hover:bg-thread-400 active:scale-[0.97]"
                    >
                      Generate clip · {CLIP_COST} credits
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
