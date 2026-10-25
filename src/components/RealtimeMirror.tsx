"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import UploadZone from "./UploadZone";
import { CloseIcon, SparkIcon } from "./icons";
import { CREDIT_COSTS } from "@/lib/credits";

const SESSION_SECONDS = 15;
const SESSION_COST = CREDIT_COSTS.realtime_15s;

type SessionState = "idle" | "connecting" | "live" | "ended" | "error";

interface RealtimeMirrorProps {
  credits: number;
  plan?: string;
  onSpend: (amount: number, reason?: string) => Promise<boolean | void>;
  onClose?: () => void;
}

export default function RealtimeMirror({
  credits,
  plan = "free",
  onSpend,
  onClose,
}: RealtimeMirrorProps) {
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [state, setState] = useState<SessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [status, setStatus] = useState("Upload a garment to start");

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
    if (!garmentFile) {
      setError("Upload a garment first");
      return;
    }
    if (credits < SESSION_COST) {
      setError(`You need ${SESSION_COST} credits for a ${SESSION_SECONDS}s live session`);
      return;
    }

    setError(null);
    setState("connecting");
    setStatus("Checking credits…");
    setSecondsLeft(SESSION_SECONDS);

    const spent = await onSpend(SESSION_COST, "tryon_realtime");
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
          facingMode: "user",
          frameRate: model.fps,
          width: { ideal: model.width },
          height: { ideal: model.height },
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

      // SDK connect options: model, onRemoteStream, mirror, initialState — no onError/onDisconnect
      const rt = await client.realtime.connect(stream, {
        model,
        mirror: "auto",
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
      });

      rtClientRef.current = rt;

      // Event listeners live on the client instance (not connect options)
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
        /* older SDK without events — errors still surface via try/catch */
      }

      setState("live");
      setStatus("Live try-on — move around to see the fit");

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
    !!garmentFile &&
    credits >= SESSION_COST &&
    (state === "idle" || state === "ended" || state === "error");

  return (
    <div className="rounded-3xl border border-white/15 bg-ink-900/80 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">Realtime mirror</h3>
          <p className="mt-1 text-sm text-ink-300">
            Live camera try-on · {SESSION_COST} credits · {SESSION_SECONDS}s session
            {plan === "free" ? " · free plan" : ""}
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

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
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
                Start live try-on · {SESSION_COST} credits
              </>
            )}
          </button>

          <p className="mt-2 text-xs text-ink-400" aria-live="polite">
            {error ? <span className="text-red-400">{error}</span> : status}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-ink-950 aspect-[3/4] sm:aspect-video lg:aspect-[3/4]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
          />
          {state !== "live" && state !== "connecting" && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <p className="text-sm text-ink-400">Your live try-on stream appears here</p>
            </div>
          )}
          {state === "live" && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-ink-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              LIVE · {secondsLeft}s
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
