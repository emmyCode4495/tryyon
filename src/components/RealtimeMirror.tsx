"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import UploadZone from "./UploadZone";
import { CloseIcon, SparkIcon } from "./icons";
import {
  CREDIT_COSTS,
  canUseRealtimeMirror,
} from "@/lib/credits";
import Link from "next/link";

const SESSION_SECONDS = 15;

type SessionState = "idle" | "connecting" | "live" | "ended" | "error";

interface RealtimeMirrorProps {
  credits: number;
  plan?: string;
  /** Shopper/free can unlock via add-on */
  mirrorAddon?: boolean;
  onSpend: (amount: number, reason?: string) => Promise<boolean | void>;
  onClose?: () => void;
}

export default function RealtimeMirror({
  credits,
  plan = "free",
  mirrorAddon = false,
  onSpend,
  onClose,
}: RealtimeMirrorProps) {
  const allowed = canUseRealtimeMirror(plan, mirrorAddon);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [fastMode, setFastMode] = useState(false);
  const [state, setState] = useState<SessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [status, setStatus] = useState("Upload a garment to start");
  const [facingUser, setFacingUser] = useState(true);

  const sessionCost = fastMode
    ? CREDIT_COSTS.realtime_fast_15s
    : CREDIT_COSTS.realtime_15s;

  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rtClientRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      rtClientRef.current?.disconnect?.();
    } catch {
      /* ignore */
    }
    rtClientRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleGarment = (file: File) => {
    if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    setGarmentFile(file);
    setGarmentPreview(URL.createObjectURL(file));
    setError(null);
    setStatus("Ready — start live try-on when you are");
  };

  const stopSession = useCallback(() => {
    cleanup();
    setState((s) => (s === "live" || s === "connecting" ? "ended" : s));
    setStatus("Session ended");
  }, [cleanup]);

  const startSession = async () => {
    if (!allowed) {
      setError("Realtime mirror is available on the Vendor plan (or with Mirror add-on).");
      return;
    }
    if (!garmentFile) {
      setError("Upload a garment first");
      return;
    }
    if (credits < sessionCost) {
      setError(
        `You need ${sessionCost} credits for a ${SESSION_SECONDS}s ${fastMode ? "fast " : ""}session (you have ${credits})`
      );
      return;
    }

    setError(null);
    setState("connecting");
    setStatus("Checking credits…");
    setSecondsLeft(SESSION_SECONDS);

    const spent = await onSpend(
      sessionCost,
      fastMode ? "tryon_realtime_fast" : "tryon_realtime"
    );
    if (spent === false) {
      setState("error");
      setError("Could not spend credits");
      return;
    }

    try {
      setStatus("Requesting camera…");
      const model = models.realtime("lucy-vton-latest");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: facingUser ? "user" : "environment",
          frameRate: model.fps,
          width: { ideal: Math.min(model.width, 720) },
          height: { ideal: Math.min(model.height, 1280) },
        },
      });
      localStreamRef.current = stream;

      setStatus("Connecting to try-on…");
      const client = createDecartClient({
        apiKeyProvider: async () => {
          const res = await fetch("/api/decart/token", { method: "POST" });
          const data = await res.json();
          if (!res.ok || !data.apiKey) {
            throw new Error(data.error || "Failed to get session token");
          }
          return data.apiKey as string;
        },
      });

      // Typed for RealTimeClientConnectOptions; speed is optional on newer SDKs
      const connectOpts = {
        model,
        mirror: (facingUser ? "auto" : false) as "auto" | boolean,
        onRemoteStream: (edited: MediaStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = edited;
            void videoRef.current.play().catch(() => {});
          }
        },
        initialState: {
          prompt: {
            text: "Substitute the person's current clothing with the garment in the reference image. Keep face, body shape, and pose natural.",
            enhance: true,
          },
          image: garmentFile,
        },
        ...(fastMode ? { speed: "fast" as const } : {}),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rt = await client.realtime.connect(stream, connectOpts as any);

      rtClientRef.current = rt;

      try {
        rt.on?.("error", (err: unknown) => {
          console.error("[realtime]", err);
          setError(err instanceof Error ? err.message : "Connection error");
          setState("error");
          cleanup();
        });
        rt.on?.("connectionChange", (connState: string) => {
          if (connState === "disconnected" || connState === "failed") {
            setState((s) => (s === "live" ? "ended" : s));
          }
        });
      } catch {
        /* older SDK */
      }

      setState("live");
      setStatus(
        fastMode
          ? "Live (fast mode) — move to see the fit"
          : "Live try-on — move around to see the fit"
      );

      timerRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopSession();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      cleanup();
      setState("error");
      setError(
        err instanceof Error
          ? err.message
          : "Could not start live session. Check camera permission and DECART_API_KEY."
      );
    }
  };

  const canStart =
    allowed &&
    !!garmentFile &&
    credits >= sessionCost &&
    (state === "idle" || state === "ended" || state === "error");

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-white/15 bg-ink-900/80 p-6 sm:p-8 text-center">
        <h3 className="font-display text-xl font-semibold text-white">
          Realtime mirror
        </h3>
        <p className="mt-3 text-sm text-ink-300 max-w-md mx-auto">
          Live camera try-on is a premium feature. Upgrade to{" "}
          <strong className="text-white">Vendor</strong> or add the Mirror add-on
          to unlock 15-second Lucy VTON sessions.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/#pricing"
            className="inline-flex h-12 items-center justify-center rounded-full bg-thread-500 px-6 text-sm font-semibold text-ink-950"
          >
            View Vendor plan
          </Link>
          <Link
            href="/studio?tab=profile"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white"
          >
            Back to profile
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-500">
          Standard session {CREDIT_COSTS.realtime_15s} credits · Fast mode{" "}
          {CREDIT_COSTS.realtime_fast_15s} credits · {SESSION_SECONDS}s cap
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-ink-900/80 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">
            Realtime mirror
          </h3>
          <p className="mt-1 text-sm text-ink-300">
            Live camera · {SESSION_SECONDS}s ·{" "}
            <span className="text-thread-400 font-medium tabular-nums">
              {credits} credits left
            </span>
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={() => {
              stopSession();
              onClose();
            }}
            className="rounded-full p-2 text-ink-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Credits + mode bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white tabular-nums">
          Session cost: {sessionCost} credits
        </span>
        <label className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-ink-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={fastMode}
            disabled={state === "connecting" || state === "live"}
            onChange={(e) => setFastMode(e.target.checked)}
            className="rounded border-ink-400"
          />
          Fast mode (2× cost)
        </label>
        <button
          type="button"
          disabled={state === "connecting" || state === "live"}
          onClick={() => setFacingUser((v) => !v)}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-ink-200 hover:bg-white/10 disabled:opacity-40"
        >
          Camera: {facingUser ? "Front" : "Rear"}
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <UploadZone
            label="Garment"
            placeholder="Upload clothing item"
            hint="Clean product shot works best."
            icon="garment"
            onFileSelect={handleGarment}
            previewUrl={garmentPreview}
            disabled={state === "connecting" || state === "live"}
          />

          <button
            type="button"
            onClick={state === "live" ? stopSession : startSession}
            disabled={state === "connecting" || (state !== "live" && !canStart)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-thread-500 text-sm font-semibold text-ink-950 transition hover:bg-thread-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {state === "connecting" ? (
              "Connecting…"
            ) : state === "live" ? (
              "Stop session"
            ) : (
              <>
                <SparkIcon className="h-4 w-4" />
                Start live try-on · {sessionCost} credits
              </>
            )}
          </button>

          <p className="mt-2 text-xs text-ink-400" aria-live="polite">
            {error ? <span className="text-red-400">{error}</span> : status}
          </p>
        </div>

        {/* Video first on mobile for better camera UX */}
        <div className="relative order-1 lg:order-2 overflow-hidden rounded-2xl bg-ink-950 aspect-[3/4] max-h-[70vh] mx-auto w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover ${
              facingUser ? "scale-x-[-1]" : ""
            }`}
          />
          {state !== "live" && state !== "connecting" && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <p className="text-sm text-ink-400">
                Your live try-on stream appears here
              </p>
            </div>
          )}
          {state === "live" && (
            <div className="absolute left-3 top-3 right-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 rounded-full bg-ink-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                LIVE · {secondsLeft}s
                {fastMode ? " · FAST" : ""}
              </div>
              <div className="rounded-full bg-ink-950/70 px-3 py-1.5 text-xs font-semibold text-thread-400 backdrop-blur tabular-nums">
                {Math.max(0, credits - sessionCost)} after
              </div>
            </div>
          )}
          {state === "connecting" && (
            <div className="absolute inset-0 grid place-items-center bg-ink-950/50">
              <p className="text-sm text-white">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
