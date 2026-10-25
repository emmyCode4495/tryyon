import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { emailConfigured, sendPasswordResetCode } from "@/lib/email/resend";
import {
  OTP_COOLDOWN_SECONDS,
  OTP_HOURLY_CAP,
  OTP_TTL_MINUTES,
  generateCode,
  hashCode,
} from "@/lib/otp";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
});

/**
 * Step 1: email a 6-digit code.
 * Always answers { ok: true } for a well-formed email, whether or not an account
 * exists, so the form can't be used to find out who has an account.
 */
export async function POST(request: Request) {
  try {
    if (!emailConfigured()) {
      return NextResponse.json({ error: "Email isn't set up yet. Please try again later." }, { status: 503 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const { email } = parsed.data;

    const service = createServiceClient();
    const now = Date.now();

    // Rate limit per email. Rows are written for unknown emails too, so the
    // limit behaves identically whether or not an account exists.
    const { data: recent } = await service
      .from("password_reset_otps")
      .select("created_at")
      .eq("email", email)
      .gte("created_at", new Date(now - 3600_000).toISOString())
      .order("created_at", { ascending: false });

    if (recent && recent.length >= OTP_HOURLY_CAP) {
      return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
    }
    if (recent?.[0]) {
      const waited = (now - new Date(recent[0].created_at).getTime()) / 1000;
      if (waited < OTP_COOLDOWN_SECONDS) {
        const retryAfter = Math.ceil(OTP_COOLDOWN_SECONDS - waited);
        return NextResponse.json(
          { error: `Please wait ${retryAfter}s before asking for another code.`, retryAfter },
          { status: 429 }
        );
      }
    }

    const code = generateCode();
    const { data: row, error: insertError } = await service
      .from("password_reset_otps")
      .insert({
        email,
        code_hash: hashCode(email, code),
        expires_at: new Date(now + OTP_TTL_MINUTES * 60_000).toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !row) {
      console.error("[password-otp/request] insert", insertError?.message);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const { data: profile } = await service.from("profiles").select("id").eq("email", email).maybeSingle();

    if (profile) {
      const sent = await sendPasswordResetCode(email, code);
      if (!sent.ok) {
        console.error("[password-otp/request] resend", sent.error);
        await service.from("password_reset_otps").delete().eq("id", row.id);
        return NextResponse.json({ error: "We couldn't send the email. Please try again." }, { status: 502 });
      }
    }

    // Housekeeping: drop codes older than a day
    await service
      .from("password_reset_otps")
      .delete()
      .lt("created_at", new Date(now - 86_400_000).toISOString());

    return NextResponse.json({ ok: true, cooldown: OTP_COOLDOWN_SECONDS });
  } catch (err) {
    console.error("[password-otp/request]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
