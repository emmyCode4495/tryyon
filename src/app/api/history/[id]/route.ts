import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { HISTORY_BUCKET } from "@/lib/history";

/** Delete one of the signed-in user's history items right now. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();
    const { data: row } = await service
      .from("tryon_history")
      .select("id, storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await service.storage.from(HISTORY_BUCKET).remove([row.storage_path]);
    await service.from("tryon_history").delete().eq("id", row.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[history] DELETE", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
