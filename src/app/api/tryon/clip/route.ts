import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CREDIT_COSTS } from "@/lib/credits";

const CLIP_COST = CREDIT_COSTS.clip;
const POLL_MS = 2000;
const MAX_POLLS = 90; // ~3 minutes

/**
 * Phase 2 – short try-on clip via Decart Lucy VTON batch.
 * multipart: personVideo (file), garment (file), optional prompt
 * Deducts 20 credits after a successful job.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.DECART_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Decart is not configured (missing DECART_API_KEY)" },
        { status: 503 }
      );
    }

    let profile: { credits: number; plan: string } | null = null;
    {
      const { data } = await supabase
        .from("profiles")
        .select("credits, plan")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    }
    if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const service = createServiceClient();
      const { data } = await service
        .from("profiles")
        .select("credits, plan")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const balance = Number(profile.credits);
    if (!Number.isFinite(balance) || balance < CLIP_COST) {
      return NextResponse.json(
        {
          error: `Insufficient credits (have ${Number.isFinite(balance) ? balance : 0}, need ${CLIP_COST})`,
          credits: Number.isFinite(balance) ? balance : 0,
        },
        { status: 402 }
      );
    }

    const form = await request.formData();
    const personVideo = form.get("personVideo");
    const garment = form.get("garment");
    const promptText =
      (form.get("prompt") as string) ||
      "Substitute the person's clothing with the garment in the reference image. Keep face, body shape, and motion natural.";

    if (!(personVideo instanceof Blob) || !(garment instanceof Blob)) {
      return NextResponse.json(
        { error: "personVideo and garment files are required" },
        { status: 400 }
      );
    }

    // Submit Decart batch job
    const jobForm = new FormData();
    jobForm.append(
      "data",
      personVideo,
      personVideo.type.includes("webm") ? "person.webm" : "person.mp4"
    );
    jobForm.append("reference_image", garment, "garment.jpg");
    jobForm.append("prompt", promptText);
    jobForm.append("resolution", "720p");
    jobForm.append("enhance_prompt", "true");

    const submitRes = await fetch("https://api.decart.ai/v1/jobs/lucy-vton-latest", {
      method: "POST",
      headers: { "X-API-KEY": apiKey },
      body: jobForm,
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => "");
      console.error("[clip] submit failed", submitRes.status, errText);
      return NextResponse.json(
        {
          error:
            submitRes.status === 401 || submitRes.status === 403
              ? "Decart API key rejected"
              : "Could not start clip job. Try again.",
        },
        { status: 502 }
      );
    }

    const submitJson = (await submitRes.json()) as { job_id?: string; id?: string };
    const jobId = submitJson.job_id || submitJson.id;
    if (!jobId) {
      console.error("[clip] no job id", submitJson);
      return NextResponse.json({ error: "Invalid job response from Decart" }, { status: 502 });
    }

    // Poll until completed
    let status = "pending";
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_MS);
      const stRes = await fetch(`https://api.decart.ai/v1/jobs/${jobId}`, {
        headers: { "X-API-KEY": apiKey },
      });
      if (!stRes.ok) continue;
      const st = (await stRes.json()) as { status?: string };
      status = (st.status || "").toLowerCase();
      if (status === "completed" || status === "succeeded" || status === "success") break;
      if (status === "failed" || status === "error" || status === "cancelled") {
        return NextResponse.json({ error: "Clip generation failed on Decart" }, { status: 502 });
      }
    }

    if (!["completed", "succeeded", "success"].includes(status)) {
      return NextResponse.json(
        { error: "Clip job timed out. Please try again." },
        { status: 504 }
      );
    }

    const contentRes = await fetch(`https://api.decart.ai/v1/jobs/${jobId}/content`, {
      headers: { "X-API-KEY": apiKey },
    });
    if (!contentRes.ok) {
      return NextResponse.json({ error: "Could not download clip" }, { status: 502 });
    }

    const contentType = contentRes.headers.get("content-type") || "video/mp4";
    const buffer = Buffer.from(await contentRes.arrayBuffer());
    const base64 = buffer.toString("base64");
    const clipDataUrl = `data:${contentType};base64,${base64}`;

    const newBalance = balance - CLIP_COST;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newBalance })
      .eq("id", user.id);

    if (updateError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const service = createServiceClient();
      await service.from("profiles").update({ credits: newBalance }).eq("id", user.id);
      await service.from("credit_transactions").insert({
        user_id: user.id,
        amount: -CLIP_COST,
        balance_after: newBalance,
        reason: "tryon_clip",
      });
    } else {
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -CLIP_COST,
        balance_after: newBalance,
        reason: "tryon_clip",
      });
    }

    const plan = profile.plan || "free";
    // Clean (no watermark flag) only for vendor
    const cleanExport = plan === "vendor";

    return NextResponse.json({
      clipUrl: clipDataUrl,
      credits: newBalance,
      plan,
      cleanExport,
      watermark: !cleanExport,
    });
  } catch (err) {
    console.error("[clip]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
