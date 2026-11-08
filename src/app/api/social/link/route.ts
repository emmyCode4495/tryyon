import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLinkCode } from "@/lib/social";
import type { SocialPlatform } from "@/lib/social";

/**
 * POST /api/social/link
 * Body: { platform?: "telegram" | "whatsapp" | "x" }
 *
 * Authenticated user generates a one-time code to link their social account.
 * They then send the code to the bot.
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

    const body = await request.json().catch(() => ({}));
    const platform = (body.platform as SocialPlatform) || undefined;

    const code = await createLinkCode(user.id, platform, 15);

    return NextResponse.json({
      code,
      expiresInMinutes: 15,
      instructions:
        platform === "telegram"
          ? `Open the @tryyon bot on Telegram and send this code: ${code}`
          : `Send this code to the tryyON bot: ${code}`,
    });
  } catch (err) {
    console.error("[social/link]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
