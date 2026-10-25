import { NextResponse, after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CREDIT_COSTS } from "@/lib/credits";
import { getDecartApiKey } from "@/lib/decart";
import { saveTryonToHistory, purgeExpiredHistory } from "@/lib/history";

const SNAPSHOT_COST = CREDIT_COSTS.snapshot;

/** Prefer current models; first success wins */
const DECART_ENDPOINTS = [
  "https://api.decart.ai/v1/generate/lucy-image-2",
  "https://api.decart.ai/v1/generate/lucy-image-latest",
  "https://api.decart.ai/v1/generate/lucy-pro-i2i",
];

/**
 * Snapshot try-on via Decart image edit (person + garment reference).
 * Deducts credits only after a successful generation.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized — sign in again" }, { status: 401 });
    }

    const apiKey = getDecartApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Decart is not configured. Add DECART_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
        },
        { status: 503 }
      );
    }

    let profile: { credits: number; plan: string } | null = null;
    let profileError: string | null = null;

    {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, plan")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        profileError = error.message;
        console.error("[tryon] profile read (user):", error);
      } else if (data) {
        profile = data;
      }
    }

    if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const service = createServiceClient();
        const { data, error } = await service
          .from("profiles")
          .select("credits, plan")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          profileError = error.message;
        } else if (data) {
          profile = data;
        }
      } catch (e) {
        console.error("[tryon] service client:", e);
      }
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: profileError
            ? `Profile not found (${profileError})`
            : "Profile not found. Sign out and sign up again.",
        },
        { status: 404 }
      );
    }

    const balance = Number(profile.credits);
    if (!Number.isFinite(balance) || balance < SNAPSHOT_COST) {
      return NextResponse.json(
        {
          error: `Insufficient credits (have ${Number.isFinite(balance) ? balance : 0}, need ${SNAPSHOT_COST})`,
          credits: Number.isFinite(balance) ? balance : 0,
        },
        { status: 402 }
      );
    }

    const form = await request.formData();
    const person = form.get("person");
    const garment = form.get("garment");
    const promptText =
      (form.get("prompt") as string) ||
      "Substitute the person's clothing with the garment shown in the reference image. Keep the person's face, body, pose, and background unchanged.";

    if (!(person instanceof Blob) || !(garment instanceof Blob)) {
      return NextResponse.json(
        { error: "Person and garment image files are required" },
        { status: 400 }
      );
    }

    // Soft size guard (Vercel body limits)
    const maxBytes = 4.5 * 1024 * 1024;
    if (person.size + garment.size > maxBytes) {
      return NextResponse.json(
        {
          error:
            "Images are too large combined. Use photos under ~2MB each (JPEG works best).",
        },
        { status: 413 }
      );
    }

    const personBuf = Buffer.from(await person.arrayBuffer());
    const garmentBuf = Buffer.from(await garment.arrayBuffer());

    let lastStatus = 0;
    let lastErr = "";
    let success: Response | null = null;

    for (const endpoint of DECART_ENDPOINTS) {
      const outbound = new FormData();
      outbound.append(
        "data",
        new Blob([personBuf], { type: person.type || "image/jpeg" }),
        "person.jpg"
      );
      outbound.append(
        "reference_image",
        new Blob([garmentBuf], { type: garment.type || "image/jpeg" }),
        "garment.jpg"
      );
      outbound.append("prompt", promptText);
      outbound.append("resolution", "720p");

      const decartRes = await fetch(endpoint, {
        method: "POST",
        // One header only: header names are case-insensitive, so sending both
        // casings gets merged into "key, key" and Decart rejects it as invalid.
        headers: { "X-API-KEY": apiKey },
        body: outbound,
      });

      if (decartRes.ok) {
        success = decartRes;
        break;
      }

      lastStatus = decartRes.status;
      lastErr = await decartRes.text().catch(() => "");
      console.error("[tryon] Decart error", endpoint, lastStatus, lastErr.slice(0, 500));

      // Don't try other models on auth failure
      if (lastStatus === 401 || lastStatus === 403) break;
    }

    if (!success) {
      if (lastStatus === 401 || lastStatus === 403) {
        return NextResponse.json(
          {
            error:
              "Decart API key rejected (401/403). Check DECART_API_KEY on Vercel matches your Decart dashboard key, then redeploy.",
          },
          { status: 502 }
        );
      }
      if (/credit|balance|quota|billing|insufficient/i.test(lastErr)) {
        return NextResponse.json(
          {
            error:
              "Decart platform balance is empty. Top up credits at platform.decart.ai (separate from tryyON credits).",
          },
          { status: 502 }
        );
      }

      let detail = lastErr.slice(0, 180).replace(/\s+/g, " ").trim();
      try {
        const j = JSON.parse(lastErr) as { detail?: unknown; message?: string; error?: string };
        if (typeof j.message === "string") detail = j.message;
        else if (typeof j.error === "string") detail = j.error;
        else if (typeof j.detail === "string") detail = j.detail;
      } catch {
        /* keep text */
      }

      return NextResponse.json(
        {
          error: detail
            ? `Decart error (${lastStatus || "no response"}): ${detail}`
            : `Try-on failed (${lastStatus || "no response"}). Check Vercel logs and DECART_API_KEY.`,
        },
        { status: 502 }
      );
    }

    const contentType = success.headers.get("content-type") || "image/jpeg";
    // Some Decart responses are JSON with base64 — handle both
    if (contentType.includes("application/json")) {
      const json = (await success.json()) as {
        image?: string;
        data?: string;
        b64_json?: string;
        url?: string;
      };
      const b64 = json.b64_json || json.image || json.data;
      if (b64 && typeof b64 === "string") {
        const resultDataUrl = b64.startsWith("data:")
          ? b64
          : `data:image/png;base64,${b64}`;
        return await finishSuccess(supabase, user.id, profile, balance, resultDataUrl);
      }
      if (json.url) {
        return await finishSuccess(supabase, user.id, profile, balance, json.url);
      }
      return NextResponse.json(
        { error: "Decart returned JSON without an image field" },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await success.arrayBuffer());
    if (buffer.length < 100) {
      return NextResponse.json(
        { error: "Decart returned an empty image. Try different photos." },
        { status: 502 }
      );
    }
    const base64 = buffer.toString("base64");
    const resultDataUrl = `data:${contentType};base64,${base64}`;

    return await finishSuccess(supabase, user.id, profile, balance, resultDataUrl);
  } catch (err) {
    console.error("[tryon]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Server error while generating try-on",
      },
      { status: 500 }
    );
  }
}

async function finishSuccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: { credits: number; plan: string },
  balance: number,
  resultDataUrl: string
) {
  const newBalance = balance - SNAPSHOT_COST;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits: newBalance })
    .eq("id", userId);

  if (updateError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const service = createServiceClient();
    await service.from("profiles").update({ credits: newBalance }).eq("id", userId);
    await service.from("credit_transactions").insert({
      user_id: userId,
      amount: -SNAPSHOT_COST,
      balance_after: newBalance,
      reason: "tryon_snapshot",
    });
  } else {
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: -SNAPSHOT_COST,
      balance_after: newBalance,
      reason: "tryon_snapshot",
    });
  }

  const watermark = !profile.plan || profile.plan === "free";

  // Keep a copy in the user's 24h history (never blocks or fails the try-on)
  const historyId = await saveTryonToHistory({
    userId,
    source: resultDataUrl,
    watermarked: watermark,
    creditsUsed: SNAPSHOT_COST,
  });
  // Opportunistically clear this user's expired items after responding
  after(() => purgeExpiredHistory(userId));

  return NextResponse.json({
    resultUrl: resultDataUrl,
    credits: newBalance,
    plan: profile.plan,
    watermark,
    historyId,
  });
}
