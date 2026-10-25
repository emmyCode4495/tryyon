"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cssVars } from "@/lib/css";
import { safeColor } from "@/lib/embed";

const PHASES = ["Reading your photo", "Fitting the garment", "Smoothing the details", "Almost there"];

function post(message: Record<string, unknown>) {
  try {
    window.parent?.postMessage(message, "*");
  } catch {
    /* ignore */
  }
}

/**
 * Embeddable try-on surface.
 * Usage: /embed?merchant=slug&garment=https://...&product_id=sku&color=%234c5cff
 * Emits postMessage events to the parent: tryyon:ready, tryyon:result.
 */
function EmbedInner() {
  const params = useSearchParams();
  const merchant = params.get("merchant") || "";
  const garmentUrl = params.get("garment") || "";
  const productId = params.get("product_id") || "";
  const primary = safeColor(params.get("color"));

  const [personFile, setPersonFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [garmentOk, setGarmentOk] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    post({ type: "tryyon:ready", merchant, productId });
  }, [merchant, productId]);

  // Cycle the status line while generating so waiting feels like progress
  useEffect(() => {
    if (!loading) return;
    setPhase(0);
    const id = window.setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 2300);
    return () => window.clearInterval(id);
  }, [loading]);

  // Release the object URL when the photo changes or the page unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const fail = useCallback((message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  }, []);

  const takeFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      fail("Please choose an image file");
      return;
    }
    setPersonFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, [fail]);

  async function runTryOn() {
    if (!personFile) {
      fail("Add a photo of yourself first");
      return;
    }
    if (!garmentUrl) {
      fail("No garment image configured for this product");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const gRes = await fetch(garmentUrl);
      if (!gRes.ok) throw new Error("Could not load garment image");
      const garmentBlob = await gRes.blob();

      const form = new FormData();
      form.append("person", personFile);
      form.append("garment", garmentBlob, "garment.jpg");
      form.append("merchant", merchant);
      form.append("product_id", productId);
      form.append("embed", "1");

      const res = await fetch("/api/embed/session", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Try-on failed");

      setResult(data.resultUrl as string);
      post({ type: "tryyon:result", productId, ok: true });
    } catch (e) {
      fail(e instanceof Error ? e.message : "Something went wrong");
      post({ type: "tryyon:result", productId, ok: false });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setPersonFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const status = error
    ? null
    : loading
      ? PHASES[phase]
      : result
        ? "Here it is on you"
        : preview
          ? "Looking good. Tap Try on"
          : "Add a photo to see it on you";

  return (
    <div
      className="min-h-screen bg-ink-50 p-4 text-ink-900 sm:p-6"
      style={cssVars({ "--brand": primary })}
    >
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold text-ink-800">Virtual try-on</p>
          <span className="text-[10px] text-ink-400">Powered by tryyON</span>
        </div>

        <div className="mt-4 space-y-4">
          {garmentUrl && garmentOk && (
            <div className="rise flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-2.5" style={cssVars({ "--d": "0.05s" })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={garmentUrl}
                alt="Garment"
                onError={() => setGarmentOk(false)}
                className="h-16 w-16 rounded-xl bg-ink-50 object-contain"
              />
              <div className="min-w-0">
                <p className="text-xs text-ink-500">Trying on</p>
                <p className="truncate text-sm font-medium text-ink-800">{productId || "This item"}</p>
              </div>
            </div>
          )}

          {/* Stage: empty → photo → result, all in one frame */}
          <div
            className="rise relative aspect-[3/4] overflow-hidden rounded-3xl border border-ink-100 bg-white"
            style={cssVars({ "--d": "0.12s" })}
          >
            {!preview && (
              <label
                data-drag={dragging}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  takeFile(e.dataTransfer.files?.[0]);
                }}
                className="embed-drop absolute inset-3 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 px-6 text-center"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-white"
                  style={{ background: primary }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1-1.6A1.5 1.5 0 0 1 10 3.7h4a1.5 1.5 0 0 1 1.3.7l1 1.6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" strokeLinejoin="round" />
                    <circle cx="12" cy="12.5" r="3.2" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-ink-800">Take or upload a photo</span>
                <span className="text-xs text-ink-500">Stand straight, full body works best</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="sr-only"
                  onChange={(e) => takeFile(e.target.files?.[0])}
                />
              </label>
            )}

            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={preview}
                src={preview}
                alt="You"
                className="upload-preview absolute inset-0 h-full w-full object-cover"
              />
            )}

            {loading && <div className="embed-scan" aria-hidden="true" />}

            {result && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={result.slice(-24)}
                src={result}
                alt="Try-on result"
                className="embed-result absolute inset-0 h-full w-full object-cover"
              />
            )}

            {preview && !loading && (
              <button
                type="button"
                onClick={reset}
                className="rise absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-md backdrop-blur transition-transform hover:-translate-y-0.5"
              >
                {result ? "Try another photo" : "Change photo"}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || !personFile}
              onClick={runTryOn}
              className="embed-btn flex h-12 flex-1 items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? (
                <span className="dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              ) : result ? (
                "Try on again"
              ) : (
                "Try on"
              )}
              {loading && <span className="sr-only">Working</span>}
            </button>
            {result && (
              <a
                href={result}
                download="tryon.jpg"
                className="rise flex h-12 items-center rounded-full border border-ink-200 bg-white px-5 text-sm font-semibold text-ink-800 transition-transform hover:-translate-y-0.5"
              >
                Save
              </a>
            )}
          </div>

          <p className="min-h-[1.25rem] text-center text-xs text-ink-500" aria-live="polite">
            {error ? (
              <span key={errorKey} className="shake inline-block text-red-600">
                {error}
              </span>
            ) : (
              <span key={status} className="status-swap inline-block">
                {status}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ink-50 p-4 sm:p-6" aria-busy="true">
          <div className="mx-auto max-w-md space-y-4">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton aspect-[3/4] rounded-3xl" />
            <div className="skeleton h-12 rounded-full" />
          </div>
        </div>
      }
    >
      <EmbedInner />
    </Suspense>
  );
}
