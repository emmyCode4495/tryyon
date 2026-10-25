"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Embeddable try-on surface.
 * Usage: /embed?merchant=slug&garment=https://...&product_id=sku
 * Or postMessage / query product image URL from parent storefront.
 */
function EmbedInner() {
  const params = useSearchParams();
  const merchant = params.get("merchant") || "";
  const garmentUrl = params.get("garment") || "";
  const productId = params.get("product_id") || "";
  const primary = params.get("color") || "#4c5cff";

  const [personFile, setPersonFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState("Upload your photo to try this on");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Notify parent that embed is ready
    try {
      window.parent?.postMessage(
        { type: "tryyon:ready", merchant, productId },
        "*"
      );
    } catch {
      /* ignore */
    }
  }, [merchant, productId]);

  async function runTryOn() {
    if (!personFile) {
      setError("Add a photo of yourself first");
      return;
    }
    if (!garmentUrl && !params.get("garment_file")) {
      setError("No garment image configured for this product");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Generating try-on…");

    try {
      // Fetch garment as blob if URL provided
      let garmentBlob: Blob;
      if (garmentUrl) {
        const gRes = await fetch(garmentUrl);
        if (!gRes.ok) throw new Error("Could not load garment image");
        garmentBlob = await gRes.blob();
      } else {
        throw new Error("Missing garment");
      }

      const form = new FormData();
      form.append("person", personFile);
      form.append("garment", garmentBlob, "garment.jpg");
      form.append("merchant", merchant);
      form.append("product_id", productId);
      form.append("embed", "1");

      const res = await fetch("/api/embed/session", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Try-on failed");

      setResult(data.resultUrl as string);
      setStatus("Done — you can save or close");
      try {
        window.parent?.postMessage(
          { type: "tryyon:result", productId, ok: true },
          "*"
        );
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setStatus("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-ink-50 text-ink-900 p-4 sm:p-6"
      style={{ ["--brand" as string]: primary }}
    >
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Virtual try-on
          </p>
          <span className="text-[10px] text-ink-400">Powered by tryyON</span>
        </div>

        <div className="mt-4 space-y-4">
          {garmentUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={garmentUrl}
              alt="Garment"
              className="h-28 w-full rounded-xl object-contain bg-white border border-ink-100"
            />
          )}

          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-white px-4 py-8 cursor-pointer hover:border-[var(--brand)]">
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPersonFile(f);
                setPreview(URL.createObjectURL(f));
                setResult(null);
                setError(null);
                setStatus("Photo ready — tap Try on");
              }}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="You" className="max-h-48 rounded-lg object-contain" />
            ) : (
              <span className="text-sm text-ink-500">Tap to take or upload a photo</span>
            )}
          </label>

          {result && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result}
              alt="Try-on result"
              className="w-full rounded-2xl border border-ink-100 bg-white"
            />
          )}

          <button
            type="button"
            disabled={loading || !personFile}
            onClick={runTryOn}
            className="flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: primary }}
          >
            {loading ? "Working…" : "Try on"}
          </button>

          <p className="text-center text-xs text-ink-500" aria-live="polite">
            {error ? <span className="text-red-600">{error}</span> : status}
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
        <div className="min-h-screen grid place-items-center text-sm text-ink-500">
          Loading try-on…
        </div>
      }
    >
      <EmbedInner />
    </Suspense>
  );
}
