"use client";

import { useCallback, useEffect, useState } from "react";
import { applyFreeWatermark } from "@/lib/watermark";
import { DownloadIcon } from "./icons";

type Item = {
  id: string;
  url: string;
  watermarked: boolean;
  creditsUsed: number;
  createdAt: string;
  expiresAt: string;
};

function timeLeft(expiresAt: string, now: number) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${Math.max(m, 1)}m left`;
}

function timeAgo(iso: string, now: number) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function TryOnHistory({ onGoTryOn }: { onGoTryOn: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Display URLs: free-plan items get the watermark baked in before showing
  const [display, setDisplay] = useState<Record<string, string | "failed">>({});
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load history");
      setItems(data.items as Item[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tick every minute so countdowns stay fresh and expired items drop off
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Prepare display URLs (watermark free-plan items, never show them clean)
  useEffect(() => {
    if (!items) return;
    let cancelled = false;
    (async () => {
      for (const it of items) {
        if (display[it.id]) continue;
        if (!it.watermarked) {
          if (!cancelled) setDisplay((d) => ({ ...d, [it.id]: it.url }));
          continue;
        }
        try {
          const marked = await applyFreeWatermark(it.url);
          if (!cancelled) setDisplay((d) => ({ ...d, [it.id]: marked }));
        } catch {
          if (!cancelled) setDisplay((d) => ({ ...d, [it.id]: "failed" }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function remove(id: string) {
    if (!window.confirm("Delete this try-on now? This can't be undone.")) return;
    const prev = items;
    setItems((cur) => (cur ? cur.filter((i) => i.id !== id) : cur));
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(prev);
      setError("Could not delete that item. Try again.");
    }
  }

  const live = (items ?? []).filter((i) => new Date(i.expiresAt).getTime() > now);

  return (
    <div role="tabpanel" className="space-y-5">
      <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-600">
        Your successful try-ons are saved here for{" "}
        <strong className="text-ink-900">24 hours</strong>, then deleted
        automatically. Download anything you want to keep.
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {items === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : live.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold text-ink-900">
            No try-ons in the last 24 hours
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Generate a snapshot and it will show up here.
          </p>
          <button
            type="button"
            onClick={onGoTryOn}
            className="mt-5 rounded-full bg-thread-500 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-thread-400"
          >
            Create a try-on
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {live.map((it) => {
            const src = display[it.id];
            return (
              <li
                key={it.id}
                className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm"
              >
                <div className="relative aspect-[3/4] bg-ink-100">
                  {src && src !== "failed" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={`Try-on from ${timeAgo(it.createdAt, now)}`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center px-3 text-center text-xs text-ink-500">
                      {src === "failed" ? "Preview unavailable" : <span className="skeleton absolute inset-0" />}
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                    {timeLeft(it.expiresAt, now)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="text-xs text-ink-500">
                    {timeAgo(it.createdAt, now)}
                    {it.watermarked ? " · watermarked" : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    {src && src !== "failed" && (
                      <a
                        href={src}
                        download={`tryyon-${it.id.slice(0, 8)}.jpg`}
                        aria-label="Download"
                        className="grid h-9 w-9 place-items-center rounded-full text-ink-700 transition hover:bg-ink-100"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      aria-label="Delete"
                      className="grid h-9 w-9 place-items-center rounded-full text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
