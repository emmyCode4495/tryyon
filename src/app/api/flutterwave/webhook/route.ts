import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  const signature = request.headers.get("verif-hash");

  if (!secretHash || signature !== secretHash) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = await request.json();
  const data = body?.data;

  if (!data || body.event !== "charge.completed") {
    return NextResponse.json({ status: "ignored" });
  }

  if (data.status !== "successful") {
    return NextResponse.json({ status: "not successful" });
  }

  const tx_ref = data.tx_ref as string;
  const flw_ref = data.flw_ref as string;

  const service = createServiceClient();

  // Idempotent: only process pending payments
  const { data: payment } = await service
    .from("payments")
    .select("*")
    .eq("tx_ref", tx_ref)
    .eq("status", "pending")
    .single();

  if (!payment) {
    return NextResponse.json({ status: "already processed or not found" });
  }

  // Mark payment successful
  await service
    .from("payments")
    .update({
      status: "successful",
      flw_ref,
      raw_response: body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  // Credit the user
  const { data: profile } = await service
    .from("profiles")
    .select("credits")
    .eq("id", payment.user_id)
    .single();

  const newBalance = (profile?.credits ?? 0) + payment.credits_purchased;

  await service
    .from("profiles")
    .update({ credits: newBalance })
    .eq("id", payment.user_id);

  await service.from("credit_transactions").insert({
    user_id: payment.user_id,
    amount: payment.credits_purchased,
    balance_after: newBalance,
    reason: "purchase",
    reference: tx_ref,
    metadata: { flw_ref, amount_ngn: payment.amount_ngn },
  });

  return NextResponse.json({ status: "ok" });
}
