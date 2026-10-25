import { createServiceClient } from "@/lib/supabase/server";

export const HISTORY_BUCKET = "tryon-history";
export const HISTORY_TTL_HOURS = 24;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

async function toBuffer(
  source: string
): Promise<{ buf: Buffer; contentType: string } | null> {
  if (source.startsWith("data:")) {
    const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(source);
    if (!m) return null;
    const contentType = m[1] || "image/png";
    const buf = m[2]
      ? Buffer.from(m[3], "base64")
      : Buffer.from(decodeURIComponent(m[3]));
    return { buf, contentType };
  }
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) return null;
    return {
      buf: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") || "image/jpeg",
    };
  }
  return null;
}

/**
 * Save a successful try-on result to the user's 24h history.
 * Never throws: history is a bonus and must not break a paid generation.
 * Returns the history id, or null if it couldn't be saved.
 */
export async function saveTryonToHistory(opts: {
  userId: string;
  source: string; // data URL or http(s) URL
  watermarked: boolean;
  creditsUsed: number;
}): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const img = await toBuffer(opts.source);
    if (!img || img.buf.length < 100) return null;

    const service = createServiceClient();
    const id = crypto.randomUUID();
    const ext = EXT[img.contentType.split(";")[0].trim()] || "jpg";
    const path = `${opts.userId}/${id}.${ext}`;

    const { error: upErr } = await service.storage
      .from(HISTORY_BUCKET)
      .upload(path, img.buf, { contentType: img.contentType, upsert: false });
    if (upErr) {
      console.error("[history] upload:", upErr.message);
      return null;
    }

    const expiresAt = new Date(
      Date.now() + HISTORY_TTL_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { error: insErr } = await service.from("tryon_history").insert({
      id,
      user_id: opts.userId,
      storage_path: path,
      watermarked: opts.watermarked,
      credits_used: opts.creditsUsed,
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("[history] insert:", insErr.message);
      await service.storage.from(HISTORY_BUCKET).remove([path]);
      return null;
    }
    return id;
  } catch (e) {
    console.error("[history] save failed:", e);
    return null;
  }
}

/**
 * Delete expired history (files + rows). Pass a userId to limit to one user.
 * Returns how many items were removed.
 */
export async function purgeExpiredHistory(userId?: string): Promise<number> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const service = createServiceClient();
  let removed = 0;

  for (let i = 0; i < 20; i++) {
    let q = service
      .from("tryon_history")
      .select("id, storage_path")
      .lte("expires_at", new Date().toISOString())
      .limit(200);
    if (userId) q = q.eq("user_id", userId);

    const { data, error } = await q;
    if (error || !data?.length) break;

    await service.storage
      .from(HISTORY_BUCKET)
      .remove(data.map((r) => r.storage_path));
    await service
      .from("tryon_history")
      .delete()
      .in(
        "id",
        data.map((r) => r.id)
      );

    removed += data.length;
    if (data.length < 200) break;
  }
  return removed;
}
