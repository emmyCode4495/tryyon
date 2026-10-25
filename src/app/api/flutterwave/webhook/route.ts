import { NextResponse } from "next/server";
import { fulfillPayment } from "@/lib/flutterwave";

/**
 * Flutterwave V3 live webhook.
 * Dashboard URL: https://www.tryyon.store/api/flutterwave/webhook
 * Header verif-hash must equal FLUTTERWAVE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    const signature = request.headers.get("verif-hash");

    if (!secret || !signature || signature !== secret) {
      console.error("[flw webhook] invalid verif-hash");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = await request.json();
    const event = body?.event as string | undefined;
    const data = body?.data as Record<string, unknown> | undefined;

    if (!data) {
      return NextResponse.json({ status: "ignored" });
    }

    const status = String(data.status || "").toLowerCase();
    const txRef = String(data.tx_ref || "");
    const flwRef = String(data.flw_ref || data.id || "");

    const isSuccess =
      status === "successful" &&
      (event === "charge.completed" ||
        event === "charge.success" ||
        typeof event === "undefined");

    if (!isSuccess || !txRef) {
      return NextResponse.json({ status: "ignored" });
    }

    const credited = await fulfillPayment({
      txRef,
      flwRef,
      raw: body,
    });

    return NextResponse.json({ status: credited ? "credited" : "ok" });
  } catch (err) {
    console.error("[flw webhook]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Flutterwave webhook endpoint. Configure this URL in Flutterwave dashboard.",
  });
}
