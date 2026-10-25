import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDecartClient } from "@decartai/sdk";
import { getAllowedOrigins, getDecartApiKey } from "@/lib/decart";

/**
 * Mint a short-lived Decart client token for realtime WebRTC sessions.
 * Permanent DECART_API_KEY never leaves the server.
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

    const apiKey = getDecartApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Decart is not configured (missing DECART_API_KEY)" },
        { status: 503 }
      );
    }

    const client = createDecartClient({ apiKey });
    const token = await client.tokens.create({
      expiresIn: 300, // 5 minutes — enough to connect
      allowedModels: ["lucy-vton-latest", "lucy-vton-3.6", "lucy-vton-3.5"],
      allowedOrigins: getAllowedOrigins(request.headers.get("origin")),
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
