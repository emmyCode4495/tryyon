import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { HISTORY_BUCKET, purgeExpiredHistory } from "@/lib/history";

export const dynamic = "force-dynamic";

/** List the signed-in user's try-on history from the last 24 hours. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "History is not configured (missing SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 503 }
      );
    }

    // Clear this user's expired items first (files + rows)
    await purgeExpiredHistory(user.id);

    const service = createServiceClient();
    const { data, error } = await service
      .from("tryon_history")
      .select("id, storage_path, watermarked, credits_used, created_at, expires_at")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[history] list:", error.message);
      return NextResponse.json(
        { error: "Could not load history. Has supabase/tryon_history.sql been run?" },
        { status: 500 }
      );
    }

    const rows = data ?? [];
    let urlByPath = new Map<string, string>();
    if (rows.length) {
      const { data: signed } = await service.storage
        .from(HISTORY_BUCKET)
        .createSignedUrls(
          rows.map((r) => r.storage_path),
          60 * 60
        );
      urlByPath = new Map<string, string>();
      for (const s of signed ?? []) {
        if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
      }
    }

    const items = rows
      .map((r) => ({
        id: r.id as string,
        url: urlByPath.get(r.storage_path) ?? null,
        watermarked: !!r.watermarked,
        creditsUsed: r.credits_used as number,
        createdAt: r.created_at as string,
        expiresAt: r.expires_at as string,
      }))
      .filter((i) => i.url);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[history] GET", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
