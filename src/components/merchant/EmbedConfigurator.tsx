"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_BRAND, eventsLines, safeColor, snippetLines } from "@/lib/embed";
import CodeLines from "./CodeLines";

const SWATCHES = ["#4c5cff", "#131845", "#e9a900", "#0f766e", "#be185d"];

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function EmbedConfigurator({ slug }: { slug: string }) {
  const [garment, setGarment] = useState("");
  const [productId, setProductId] = useState("");
  const [color, setColor] = useState(DEFAULT_BRAND);
  const [tab, setTab] = useState<"html" | "events">("html");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const timer = useRef<number | null>(null);

  const lines = tab === "html" ? snippetLines({ slug, garment, productId, color }) : eventsLines();
  const text = lines.join("\n");

  // Debounce so typing doesn't reload the preview on every keystroke
  useEffect(() => {
    const t = window.setTimeout(() => {
      const q = new URLSearchParams({ merchant: slug, product_id: productId.trim() || "SKU123" });
      if (garment.trim()) q.set("garment", garment.trim());
      const c = safeColor(color);
      if (c !== DEFAULT_BRAND) q.set("color", c);
      const next = `/embed?${q.toString()}`;
      setPreviewSrc((prev) => {
        if (prev !== next) setLoaded(false);
        return next;
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [slug, garment, productId, color]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  async function copy() {
    const ok = await writeClipboard(text);
    if (!ok) return;
    setCopied(true);
    setFlash((n) => n + 1);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  }

  function togglePreview() {
    setShowPreview((s) => !s);
    setEverOpened(true);
  }

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-ink-700">Product image URL</span>
          <input
            className="field mt-1.5"
            value={garment}
            onChange={(e) => setGarment(e.target.value)}
            placeholder="https://yourstore.com/images/linen-tee.jpg"
            inputMode="url"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink-700">Product ID</span>
          <input
            className="field mt-1.5"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="SKU123"
          />
        </label>
        <div>
          <span className="text-sm font-medium text-ink-700">Button colour</span>
          <div className="mt-1.5 flex items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Use ${c}`}
                aria-pressed={safeColor(color) === c}
                className="swatch h-8 w-8 rounded-full"
                style={{ background: c }}
              />
            ))}
            <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-ink-200 bg-[conic-gradient(from_0deg,#ff6b6b,#ffd25e,#7ad07a,#4c5cff,#c15cff,#ff6b6b)]">
              <span className="sr-only">Custom colour</span>
              <input
                type="color"
                value={safeColor(color)}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Code */}
      <div className="overflow-hidden rounded-2xl bg-ink-950">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
          <div role="tablist" aria-label="Snippet type" className="relative flex rounded-full p-0.5">
            {(
              [
                ["html", "Embed"],
                ["events", "Listen for events"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="tab-pill rounded-full px-3 py-1.5 text-xs font-semibold"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copy}
            data-copied={copied}
            className="copy-btn relative inline-flex h-8 min-w-[5.5rem] items-center justify-center overflow-hidden rounded-full px-3.5 text-xs font-semibold text-white"
            aria-live="polite"
          >
            <span className="copy-label" aria-hidden={copied}>
              Copy
            </span>
            <span className="copy-done absolute inset-0 flex items-center justify-center gap-1.5" aria-hidden={!copied}>
              <svg viewBox="0 0 16 16" className="copy-check h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="m3 8.5 3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied
            </span>
            <span className="sr-only">{copied ? "Copied to clipboard" : ""}</span>
          </button>
        </div>
        <div key={`${tab}-${flash}`} className={`px-3 py-4 ${flash ? "code-flash" : "pane-in"}`}>
          <CodeLines lines={lines} />
        </div>
      </div>

      {tab === "html" ? (
        <p className="text-xs leading-relaxed text-ink-500">
          Swap the product image URL for each product page. Without one,{" "}
          <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-700">YOUR_PRODUCT_IMAGE_URL</code> stays in the
          snippet as a placeholder.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-ink-500">
          The embed posts <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-700">tryyon:ready</code> when it
          loads and <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-700">tryyon:result</code> after a
          successful try-on, so you can track conversions on your side.
        </p>
      )}

      {/* Live preview */}
      <div>
        <button
          type="button"
          onClick={togglePreview}
          aria-expanded={showPreview}
          className="inline-flex items-center gap-2 text-sm font-semibold text-chalk-600 hover:text-chalk-700"
        >
          <span className="chev inline-block" data-open={showPreview} aria-hidden="true">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 3.5 4.5 4.5L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {showPreview ? "Hide live preview" : "See it live, exactly as shoppers do"}
        </button>

        <div className="collapse-y" data-open={showPreview}>
          <div>
            <div className="pt-4">
              <div className="relative mx-auto h-[640px] max-w-[420px] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[0_30px_60px_-30px_rgba(19,24,69,0.5)]">
                <div className="skeleton absolute inset-0" aria-hidden="true" data-done={loaded} />
                {everOpened && previewSrc && (
                  <iframe
                    key={previewSrc}
                    src={previewSrc}
                    title="Live embed preview"
                    allow="camera"
                    onLoad={() => setLoaded(true)}
                    className="preview-frame absolute inset-0 h-full w-full border-0"
                    data-loaded={loaded}
                  />
                )}
              </div>
              <p className="mt-3 text-center text-xs text-ink-500">
                A real try-on here uses your credits, same as on your site.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
