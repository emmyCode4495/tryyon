import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { OTP_LENGTH, OTP_MAX_ATTEMPTS, codeMatches } from "@/lib/otp";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
  // bcrypt, which Supabase uses, only reads the first 72 bytes
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
});

const INVALID = "That code is invalid or has expired.";

/** Step 2: check the code, then set the new password. */
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const msg = first?.path[0] === "password" ? first.message : INVALID;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { email, code, password } = parsed.data;

    const service = createServiceClient();

    const { data: row } = await service
      .from("password_reset_otps")
      .select("id, code_hash, attempts")
      .eq("email", email)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row || row.attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    // Count the attempt before checking it. The attempts = old value guard means
    // two parallel guesses can't both use the same slot.
    const { data: bumped } = await service
      .from("password_reset_otps")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("attempts", row.attempts)
      .select("id");

    if (!bumped?.length) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    if (!codeMatches(email, code, row.code_hash)) {
      const left = OTP_MAX_ATTEMPTS - (row.attempts + 1);
      return NextResponse.json(
        {
          error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Request a new code.",
          attemptsLeft: left,
        },
        { status: 400 }
      );
    }

    const { data: profile } = await service.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    const { error: updateError } = await service.auth.admin.updateUserById(profile.id, { password });
    if (updateError) {
      console.error("[password-otp/verify] update", updateError.message);
      return NextResponse.json(
        { error: updateError.status === 422 ? updateError.message : "Couldn't update your password. Please try again." },
        { status: updateError.status === 422 ? 400 : 500 }
      );
    }

    // Single use: remove every outstanding code for this email
    await service.from("password_reset_otps").delete().eq("email", email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[password-otp/verify]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
