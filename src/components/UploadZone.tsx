"use client";

import { useId, useRef, useState } from "react";
import { CheckIcon, RefreshIcon, ShirtIcon, UserIcon } from "./icons";

interface UploadZoneProps {
  label: string;
  placeholder: string;
  icon: "person" | "garment";
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
  hint?: string;
  disabled?: boolean;
}

/**
 * Drop zone drawn as a stitched outline. The person zone is an arch (a mirror),
 * the garment zone is a swing tag.
 */
export default function UploadZone({
  label,
  placeholder,
  icon,
  onFileSelect,
  previewUrl,
  hint,
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (JPG, PNG or WebP).");
      return;
    }
    setError(null);
    onFileSelect(file);
  };

  const shape = icon === "person" ? "arch" : "tag";

  const state = previewUrl
    ? "border-transparent bg-white/[0.06]"
    : isDragOver
      ? "border-chalk-300 bg-chalk-500/20 scale-[1.025]"
      : "border-white/25 bg-white/[0.04] hover:border-chalk-300/70 hover:bg-white/[0.07]";

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <div className="mb-3 flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-white">
          {label}
        </label>
        <span
          className={`flex items-center gap-1 text-xs font-medium text-thread-400 transition-all duration-500 ${
            previewUrl ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
          }`}
        >
          <CheckIcon className="h-3.5 w-3.5" />
          Added
        </span>
      </div>

      <div
        className={`${shape} group relative aspect-[3/4] w-full cursor-pointer overflow-hidden border-2 border-dashed transition-[border-color,background-color,transform] duration-300 ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-chalk-300 ${state}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (!disabled) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          title=""
          disabled={disabled}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            // allow picking the same file again
            e.target.value = "";
          }}
        />

        {/* Punched hole of the swing tag */}
        {icon === "garment" && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-3 z-[5] h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/30 bg-ink-950"
          />
        )}

        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={previewUrl}
              src={previewUrl}
              alt={`${label} preview`}
              className={`upload-preview absolute inset-0 h-full w-full ${
                icon === "person"
                  ? "object-cover object-top"
                  : "bg-white object-contain p-5 pt-8"
              }`}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-3 z-[5] mx-auto flex w-fit items-center gap-1.5 rounded-full bg-ink-950/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              <RefreshIcon className="h-3.5 w-3.5" />
              Replace
            </span>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-3 pt-4 text-center">
            <div
              className={`grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-1 ${
                isDragOver ? "-translate-y-2 scale-110" : ""
              }`}
            >
              {icon === "person" ? (
                <UserIcon className="h-6 w-6" />
              ) : (
                <ShirtIcon className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {isDragOver ? "Drop to upload" : placeholder}
              </p>
              <p className="mt-0.5 text-xs text-ink-300">or drag & drop</p>
            </div>
            {hint && <p className="max-w-[12rem] text-xs leading-snug text-ink-400">{hint}</p>}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-thread-400">
          {error}
        </p>
      )}
    </div>
  );
}
