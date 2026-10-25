import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CREDIT_PACKS } from "@/lib/currency";

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
    const pack = CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    const currency = body.currency === "USD" ? "USD" : "NGN";
    const amount = currency === "USD" ? pack.amountUsd : pack.amountNgn;
    // Store NGN equivalent in payments table for consistency with existing schema
    const amountNgn = pack.amountNgn;

    const tx_ref = `tryyon_${user.id.slice(0, 8)}_${Date.now()}`;

    // Record pending payment
    const service = createServiceClient();
    await service.from("payments").insert({
      user_id: user.id,
      tx_ref,
      amount_ngn: amountNgn,
      credits_purchased: pack.credits,
      status: "pending",
    });

    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/studio?payment=success`,
      customer: {
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      },
      customizations: {
        title: "tryyON Credits",
        description: `${pack.credits} credits top-up`,
        logo: `${process.env.NEXT_PUBLIC_APP_URL}/icon-192.png`,
      },
      meta: {
        user_id: user.id,
        pack_id: pack.id,
        credits: pack.credits,
        currency,
      },
    };

    const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const flwData = await flwRes.json();

    if (flwData.status !== "success" || !flwData.data?.link) {
      console.error("Flutterwave init error", flwData);
      return NextResponse.json(
        { error: flwData.message || "Payment init failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ payment_link: flwData.data.link, tx_ref });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
