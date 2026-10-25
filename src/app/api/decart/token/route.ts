import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDecartClient } from "@decartai/sdk";

/**
 * Mint a short-lived Decart client token for realtime WebRTC sessions.
 * Permanent DECART_API_KEY never leaves the server.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.DECART_API_KEY;
   
    if (!apiKey) {
      return NextResponse.json(
        { error: "Decart is not configured (missing DECART_API_KEY)" },
        { status: 503 }
      );
    }

    const client = createDecartClient({ apiKey });
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined;

    const token = await client.tokens.create({
      expiresIn: 300, // 5 minutes — enough to connect
      allowedModels: ["lucy-vton-latest", "lucy-vton-3.6", "lucy-vton-3.5"],
      ...(origin ? { allowedOrigins: [origin, "http://localhost:3000"] } : {}),
    });

    return NextResponse.json({
      apiKey: token.apiKey,
      expiresAt: token.expiresAt,
    });
  } catch (err) {
    console.error("[decart/token]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create token" },
      { status: 500 }
    );
  }
}
