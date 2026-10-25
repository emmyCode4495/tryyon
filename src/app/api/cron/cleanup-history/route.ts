import { NextResponse } from "next/server";
import { purgeExpiredHistory } from "@/lib/history";

export const dynamic = "force-dynamic";

/**
 * Global sweep of expired try-on history (all users).
 * Called by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const removed = await purgeExpiredHistory();
  return NextResponse.json({ removed });
}
