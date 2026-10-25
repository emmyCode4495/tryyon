import { createServiceClient } from "@/lib/supabase/server";

type FulfillArgs = {
  txRef: string;
  flwRef: string;
  raw: unknown;
};

/**
 * Idempotent: credits user once when payment moves pending → successful.
 */
export async function fulfillPayment(args: FulfillArgs): Promise<boolean> {
  const service = createServiceClient();
  const { txRef, flwRef, raw } = args;

  const { data: payment, error: payErr } = await service
    .from("payments")
    .select("id, user_id, credits_purchased, status")
    .eq("tx_ref", txRef)
    .maybeSingle();

  if (payErr || !payment) {
    console.error("[flw] payment not found for tx_ref", txRef, payErr);
    return false;
  }

  if (payment.status === "successful") {
    return false;
  }

  const credits = Number(payment.credits_purchased) || 0;

  const { data: profile } = await service
    .from("profiles")
    .select("credits")
    .eq("id", payment.user_id)
    .single();

  const current = Number(profile?.credits) || 0;
  const newBalance = current + credits;

  const { data: updated, error: updErr } = await service
    .from("payments")
    .update({
      status: "successful",
      flw_ref: flwRef || null,
      raw_response: raw,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updErr || !updated) {
    return false;
  }

  if (credits > 0) {
    await service
      .from("profiles")
      .update({ credits: newBalance })
      .eq("id", payment.user_id);

    await service.from("credit_transactions").insert({
      user_id: payment.user_id,
      amount: credits,
      balance_after: newBalance,
      reason: "purchase",
      reference: txRef,
    });
  }

  console.info("[flw] credited", {
    user_id: payment.user_id,
    credits,
    newBalance,
    txRef,
  });

  return true;
}
