import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const reason = (body.reason as string) || "tryon_snapshot";

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: profile } = await service
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits < amount) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const newBalance = profile.credits - amount;

    await service
      .from("profiles")
      .update({ credits: newBalance })
      .eq("id", user.id);

    await service.from("credit_transactions").insert({
      user_id: user.id,
      amount: -amount,
      balance_after: newBalance,
      reason,
    });

    return NextResponse.json({ credits: newBalance });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
