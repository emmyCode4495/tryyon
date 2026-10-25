import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fulfillPayment } from "@/lib/flutterwave";

/**
 * Fallback when user returns from Flutterwave (?payment=success&transaction_id=...).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id") || searchParams.get("id");
    let txRef = searchParams.get("tx_ref") || searchParams.get("txRef");

    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
    }

    let flwData: Record<string, unknown> | null = null;

    if (transactionId) {
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      const json = await res.json();
      if (json.status === "success" && json.data) {
        flwData = json.data as Record<string, unknown>;
        txRef = String(flwData.tx_ref || txRef || "");
      }
    } else if (txRef) {
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      const json = await res.json();
      if (json.status === "success" && json.data) {
        flwData = json.data as Record<string, unknown>;
      }
    } else {
      return NextResponse.json(
        { error: "transaction_id or tx_ref required" },
        { status: 400 }
      );
    }

    if (!flwData || !txRef) {
      return NextResponse.json({ error: "Could not verify payment" }, { status: 502 });
    }

    const service = createServiceClient();
    const { data: payment } = await service
      .from("payments")
      .select("user_id, status, credits_purchased")
      .eq("tx_ref", txRef)
      .maybeSingle();

    if (!payment || payment.user_id !== user.id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const status = String(flwData.status || "").toLowerCase();
    if (status !== "successful") {
      return NextResponse.json({
        status: payment.status,
        message: `Payment status: ${status}`,
      });
    }

    await fulfillPayment({
      txRef,
      flwRef: String(flwData.flw_ref || flwData.id || ""),
      raw: flwData,
    });

    const { data: profile } = await service
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      status: "successful",
      credits: profile?.credits ?? null,
      credited: payment.credits_purchased,
    });
  } catch (err) {
    console.error("[flw verify]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
