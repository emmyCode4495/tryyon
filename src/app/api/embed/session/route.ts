import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CREDIT_COSTS } from "@/lib/credits";
import { getDecartApiKey } from "@/lib/decart";

/**
 * Phase 4 embed try-on.
 * Bills the merchant wallet (not the end shopper).
 * multipart: person, garment, merchant (slug), product_id
 */
export async function POST(request: Request) {
  try {
    const apiKey = getDecartApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Try-on not configured" }, { status: 503 });
    }

    const form = await request.formData();
    const person = form.get("person");
    const garment = form.get("garment");
    const merchantSlug = String(form.get("merchant") || "");
    const productId = String(form.get("product_id") || "");

    if (!(person instanceof Blob) || !(garment instanceof Blob)) {
      return NextResponse.json({ error: "person and garment required" }, { status: 400 });
    }
    if (!merchantSlug) {
      return NextResponse.json({ error: "merchant slug required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: merchant } = await service
      .from("merchants")
      .select("id, credits_balance, name")
      .eq("slug", merchantSlug)
      .maybeSingle();

    if (!merchant) {
      return NextResponse.json({ error: "Unknown merchant" }, { status: 404 });
    }

    const cost = CREDIT_COSTS.snapshot;
    if (Number(merchant.credits_balance) < cost) {
      return NextResponse.json(
        { error: "Merchant allowance exhausted. Contact the store." },
        { status: 402 }
      );
    }

    const outbound = new FormData();
    outbound.append("data", person, "person.jpg");
    outbound.append("reference_image", garment, "garment.jpg");
    outbound.append(
      "prompt",
      "Substitute the person's clothing with the garment shown in the reference image. Keep face, body, pose, and background unchanged."
    );
    outbound.append("resolution", "720p");

    const decartRes = await fetch("https://api.decart.ai/v1/generate/lucy-image-2", {
      method: "POST",
      headers: { "X-API-KEY": apiKey },
      body: outbound,
    });

    if (!decartRes.ok) {
      const errText = await decartRes.text().catch(() => "");
      console.error("[embed]", decartRes.status, errText);
      return NextResponse.json({ error: "Generation failed" }, { status: 502 });
    }

    const contentType = decartRes.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await decartRes.arrayBuffer());
    const resultDataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

    const newBal = Number(merchant.credits_balance) - cost;
    await service
      .from("merchants")
      .update({ credits_balance: newBal, updated_at: new Date().toISOString() })
      .eq("id", merchant.id);

    await service.from("merchant_usage").insert({
      merchant_id: merchant.id,
      event: "snapshot",
      credits: cost,
      meta: { product_id: productId },
    });

    return NextResponse.json({
      resultUrl: resultDataUrl,
      merchant: merchant.name,
      watermark: true,
    });
  } catch (err) {
    console.error("[embed session]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
