"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
};

/** Six single-digit boxes. Supports typing, backspace, arrows, paste and SMS/email autofill. */
export default function OtpInput({ value, onChange, length = 6, disabled, invalid, autoFocus }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const digitsOnly = (s: string) => s.replace(/\D/g, "").slice(0, length);

  function handleChange(i: number, raw: string) {
    const d = digitsOnly(raw);
    // Several characters at once means paste or autofill: take them all
    if (d.length > 1) {
      onChange(d);
      focus(d.length >= length ? length - 1 : d.length);
      return;
    }
    if (!d) return;
    onChange(value.slice(0, i) + d + value.slice(i + 1));
    focus(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  }

  return (
    <div role="group" aria-label={`${length}-digit code`} className="flex justify-center gap-2 sm:gap-2.5">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => {
            e.preventDefault();
            const d = digitsOnly(e.clipboardData.getData("text"));
            if (d) {
              onChange(d);
              focus(d.length >= length ? length - 1 : d.length);
            }
          }}
          // Keep typing contiguous: a click past the next empty box jumps back to it
          onFocus={(e) => {
            if (i > value.length) focus(value.length);
            else e.target.select();
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          data-filled={!!value[i]}
          className="otp-box h-13 w-11 rounded-xl border bg-white text-center font-display text-xl font-semibold text-ink-900 sm:w-12"
        />
      ))}
    </div>
  );
}
