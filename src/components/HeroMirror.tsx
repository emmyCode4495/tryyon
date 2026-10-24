"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";
import { BlazerGarment, DressGarment, FormBase, TeeGarment } from "./Garments";

const CHIPS = [
  { name: "Linen tee", dot: "bg-chalk-500" },
  { name: "Wool blazer", dot: "bg-thread-500" },
  { name: "Slip dress", dot: "bg-ink-800" },
];

/**
 * The hero's one memorable moment: a scan line fits garments onto a dress
 * form, one after another. The mirror tilts and its reflection slides with
 * the pointer.
 */
export default function HeroMirror() {
  const tiltRef = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width).toFixed(3));
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height).toFixed(3));
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "0.5");
    el.style.setProperty("--my", "0.5");
  };

  return (
    <div
      className="rise relative mx-auto w-[min(78vw,22rem)] lg:mx-0 lg:ml-auto lg:w-[25rem]"
      style={{ "--d": "0.35s" } as React.CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {/* Stitched outline offset behind the mirror */}
      <div
        aria-hidden="true"
        className="arch absolute inset-0 -translate-y-5 translate-x-6 border-2 border-dashed border-ink-300"
      />

      <div
        ref={tiltRef}
        role="img"
        aria-label="A scan line fits a linen tee, a wool blazer and a slip dress onto a dress form, one after another."
        className="mirror-tilt relative"
      >
        <div className="mirror-frame arch p-2.5">
          <div className="mirror-glass arch relative aspect-[3/4] overflow-hidden" style={{ "--r": "20px" } as React.CSSProperties}>
            <FormBase className="absolute inset-0 h-full w-full" />

            <div className="garment garment-1">
              <TeeGarment className="h-full w-full" />
            </div>
            <div className="garment garment-2">
              <BlazerGarment className="h-full w-full" />
            </div>
            <div className="garment garment-3">
              <DressGarment className="h-full w-full" />
            </div>

            <div className="scan" />
          </div>
        </div>
      </div>

      {/* Garment name tag, swaps with the garment */}
      <div aria-hidden="true" className="absolute -left-3 bottom-24 h-10 w-40 sm:-left-10">
        {CHIPS.map((c, i) => (
          <div
            key={c.name}
            className={`chip chip-${i + 1} absolute inset-0 flex items-center gap-2.5 rounded-full bg-white pl-3 pr-4 text-sm font-medium text-ink-900 shadow-[0_12px_30px_-10px_rgba(19,24,69,0.45)]`}
          >
            <span className={`h-3 w-3 rounded-full ${c.dot}`} />
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}
