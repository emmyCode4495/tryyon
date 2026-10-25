"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import UploadZone from "./UploadZone";
import { FormBase } from "./Garments";
import { DownloadIcon, ShareIcon, SparkIcon } from "./icons";
import { applyFreeWatermark } from "@/lib/watermark";
import RealtimeMirror from "./RealtimeMirror";
import { CREDIT_COSTS } from "@/lib/credits";

const SNAPSHOT_COST = CREDIT_COSTS.snapshot;
const CLIP_COST = CREDIT_COSTS.clip;

const STAGES = ["Uploading photos", "Fitting the garment", "Finishing details"];

interface TryOnStudioProps {
  credits: number;
  plan?: string;
  onSpend: (amount: number, reason?: string) => void | Promise<boolean | void>;
  onCreditsUpdate?: (credits: number) => void;
  /** When true, hide Live mirror button (dashboard uses a separate tab). */
  hideRealtime?: boolean;
}

export default function TryOnStudio({
  credits,
  plan = "free",
  onSpend,
  onCreditsUpdate,
  hideRealtime = false,
}: TryOnStudioProps) {
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isWatermarked, setIsWatermarked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRealtime, setShowRealtime] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [clipLoading, setClipLoading] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);
  const [clipClean, setClipClean] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const isFree = !plan || plan === "free";
  const canGenerate =
    !!personFile && !!garmentFile && credits >= SNAPSHOT_COST && !isGenerating;

  const handlePersonSelect = (file: File) => {
    if (personPreview) URL.revokeObjectURL(personPreview);
    setPersonFile(file);
    setPersonPreview(URL.createObjectURL(file));
    setResultUrl(null);
    setIsWatermarked(false);
    setClipUrl(null);
    setClipError(null);
    setError(null);
  };

  const handleGarmentSelect = (file: File) => {
    if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    setGarmentFile(file);
    setGarmentPreview(URL.createObjectURL(file));
    setResultUrl(null);
    setIsWatermarked(false);
    setClipUrl(null);
    setClipError(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!canGenerate || !personFile || !garmentFile) return;

    setIsGenerating(true);
    setStage(0);
    setIsWatermarked(false);
    setError(null);
    setResultUrl(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const t1 = window.setTimeout(() => setStage(1), 800);
    const t2 = window.setTimeout(() => setStage(2), 2000);

    try {
      const form = new FormData();
      form.append("person", personFile);
      form.append("garment", garmentFile);

      const res = await fetch("/api/tryon", {
        method: "POST",
        body: form,
        signal: ac.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (typeof data.credits === "number") {
        onCreditsUpdate?.(data.credits);
      }

      let url = data.resultUrl as string;
      const needWatermark = data.watermark ?? isFree;

      if (needWatermark && url) {
        try {
          url = await applyFreeWatermark(url);
          setIsWatermarked(true);
        } catch {
          setIsWatermarked(true);
        }
      } else {
        setIsWatermarked(false);
      }

      setResultUrl(url);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error(err);
      setError(err instanceof Error ? err.message : "Try-on failed");
    } finally {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      setIsGenerating(false);
    }
  };


  const handleGenerateClip = async () => {
    if (!personFile || !garmentFile || clipLoading) return;
    if (credits < CLIP_COST) {
      setClipError(`You need ${CLIP_COST} credits for a clip`);
      return;
    }

    setClipLoading(true);
    setClipError(null);
    setClipUrl(null);

    try {
      // Build a short person video from the photo for Decart batch VTON
      const { imageUrlToVideoBlob } = await import("@/lib/makeClipVideo");
      const personPreviewUrl = personPreview || URL.createObjectURL(personFile);
      const personVideo = await imageUrlToVideoBlob(personPreviewUrl, {
        durationSec: 5,
        kenBurns: false,
        fps: 24,
      });

      const form = new FormData();
      form.append("personVideo", personVideo, "person.webm");
      form.append("garment", garmentFile);

      const res = await fetch("/api/tryon/clip", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Clip generation failed");

      if (typeof data.credits === "number") onCreditsUpdate?.(data.credits);
      setClipUrl(data.clipUrl as string);
      setClipClean(!!data.cleanExport);
    } catch (err) {
      console.error(err);
      setClipError(err instanceof Error ? err.message : "Clip failed");
    } finally {
      setClipLoading(false);
    }
  };

  let helper: ReactNode;
  if (error) helper = <span className="text-red-400">{error}</span>;
  else if (isGenerating) helper = "Fitting in progress. This takes a few seconds.";
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
  else if (isFree)
    helper = `Ready. This uses ${SNAPSHOT_COST} credits · free results include a watermark.`;
  else helper = `Ready. This uses ${SNAPSHOT_COST} credits.`;

  return (
    <section id="try-on" className="studio-mat relative isolate overflow-hidden bg-ink-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Create your try-on
            </h2>
            <p className="mt-4 max-w-md text-lg text-ink-300">
              {hideRealtime
                ? "Upload your photo and a garment for a snapshot try-on."
                : "Snapshot from two photos, or open the live realtime mirror."}
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

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate && !isGenerating}
                aria-busy={isGenerating}
                className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-thread-500 px-8 text-base font-semibold text-ink-950 transition duration-200 hover:bg-thread-400 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
              >
                {isGenerating ? (
                  "Generating…"
                ) : (
                  <>
                    <SparkIcon className="h-5 w-5" />
                    Generate snapshot · {SNAPSHOT_COST} credits
                  </>
                )}
              </button>

              {!hideRealtime && (
                <button
                  type="button"
                  onClick={() => setShowRealtime(true)}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Live mirror · {CREDIT_COSTS.realtime_15s} credits
                </button>
              )}
            </div>

            <p aria-live="polite" className="mt-3 min-h-5 text-sm text-ink-300">
              {helper}
            </p>
          </div>

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
                      key={resultUrl.slice(0, 80)}
                      src={resultUrl}
                      alt="Your try-on result"
                      className="result-img absolute inset-0 h-full w-full object-cover object-top"
                      draggable={false}
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
                      <p className="mt-1 text-sm text-ink-300">Powered by Decart</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="collapse-y" data-open={!!resultUrl}>
              <div inert={!resultUrl}>
                <div className="pt-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold">Your result</h3>
                    <span className="text-sm text-ink-300">
                      {SNAPSHOT_COST} credits used
                      {isWatermarked ? " · watermarked" : ""}
                    </span>
                  </div>

                  {isWatermarked && (
                    <p className="mt-2 text-xs text-ink-400">
                      Free plan results include a permanent watermark. Upgrade for clean images.
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <a
                      href={resultUrl ?? undefined}
                      download={
                        isWatermarked ? "tryyon-result-watermarked.jpg" : "tryyon-result.jpg"
                      }
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
                      Turn this into a 5-second try-on clip for Instagram or WhatsApp Status.
                      {!clipClean && plan !== "vendor" && (
                        <> Clean, watermark-free exports are on the Vendor plan.</>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateClip}
                      disabled={clipLoading || credits < CLIP_COST || !personFile || !garmentFile}
                      className="mt-4 inline-flex h-11 items-center rounded-full bg-thread-500 px-6 text-sm font-semibold text-ink-950 transition hover:bg-thread-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {clipLoading ? "Generating clip…" : `Generate clip · ${CLIP_COST} credits`}
                    </button>
                    {clipError && (
                      <p className="mt-2 text-xs text-red-400">{clipError}</p>
                    )}
                    {clipUrl && (
                      <div className="mt-4 space-y-3">
                        <video
                          src={clipUrl}
                          controls
                          playsInline
                          className="w-full rounded-xl bg-ink-950"
                        />
                        <a
                          href={clipUrl}
                          download={
                            clipClean ? "tryyon-clip.webm" : "tryyon-clip-preview.webm"
                          }
                          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-ink-900"
                        >
                          Download clip
                          {!clipClean ? " (plan watermark may apply on share)" : ""}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showRealtime && (
          <div className="mt-14">
            <RealtimeMirror
              credits={credits}
              plan={plan}
              onSpend={async (amount, reason) => {
                const ok = await onSpend(amount, reason);
                return ok;
              }}
              onClose={() => setShowRealtime(false)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
