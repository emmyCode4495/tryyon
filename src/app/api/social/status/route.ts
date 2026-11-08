import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/social/status
 * Returns the current user's linked social accounts.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();
    const { data: links } = await service
      .from("social_links")
      .select("platform, platform_username, display_name, linked_at, last_used_at")
      .eq("user_id", user.id)
      .order("linked_at", { ascending: false });

    return NextResponse.json({ links: links || [] });
  } catch (err) {
    console.error("[social/status]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/social/status
 * Body: { platform: "telegram" }
 * Unlink a social account.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const platform = body.platform;
    if (!platform) {
      return NextResponse.json({ error: "platform required" }, { status: 400 });
    }

    const service = createServiceClient();
    await service
      .from("social_links")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", platform);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[social/status DELETE]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
