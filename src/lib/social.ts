import { createServiceClient } from "@/lib/supabase/server";
import { CREDIT_COSTS } from "@/lib/credits";

export type SocialPlatform = "telegram" | "whatsapp" | "x" | "discord";

export interface LinkedUser {
  userId: string;
  email: string | null;
  fullName: string | null;
  credits: number;
  plan: string;
  mirrorAddon: boolean;
  platformUsername: string | null;
}

/**
 * Look up a TryyON user by their social platform identity.
 * Returns null if the account is not linked yet.
 */
export async function getUserBySocial(
  platform: SocialPlatform,
  platformUserId: string
): Promise<LinkedUser | null> {
  const service = createServiceClient();

  const { data: link, error } = await service
    .from("social_links")
    .select(
      `
      user_id,
      platform_username,
      profiles!inner (
        id,
        email,
        full_name,
        credits,
        plan,
        mirror_addon
      )
    `
    )
    .eq("platform", platform)
    .eq("platform_user_id", String(platformUserId))
    .maybeSingle();

  if (error || !link) return null;

  // Update last_used_at (fire-and-forget)
  service
    .from("social_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("platform", platform)
    .eq("platform_user_id", String(platformUserId))
    .then(() => {});

  const profile = (link as any).profiles;
  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    credits: Number(profile.credits),
    plan: profile.plan,
    mirrorAddon: !!profile.mirror_addon,
    platformUsername: link.platform_username,
  };
}

/**
 * Spend credits for a linked social user.
 * Uses the same ledger as the website.
 * Returns new balance on success, or null on insufficient credits / error.
 */
export async function spendCreditsForSocialUser(
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, unknown> = {}
): Promise<{ credits: number } | { error: string; credits: number }> {
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { error: "Profile not found", credits: 0 };
  }

  const balance = Number(profile.credits);
  if (balance < amount) {
    return { error: "Insufficient credits", credits: balance };
  }

  const newBalance = balance - amount;

  const { error: updateError } = await service
    .from("profiles")
    .update({ credits: newBalance })
    .eq("id", userId);

  if (updateError) {
    return { error: "Failed to update credits", credits: balance };
  }

  await service.from("credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    reason,
    metadata: { source: "social_bot", ...metadata },
  });

  return { credits: newBalance };
}

/**
 * Generate a short-lived one-time link code for the currently logged-in user.
 * User will send this code to the bot to complete linking.
 */
export async function createLinkCode(
  userId: string,
  platform?: SocialPlatform,
  ttlMinutes = 15
): Promise<string> {
  const service = createServiceClient();
  const code = generateCode();

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  await service.from("social_link_codes").insert({
    user_id: userId,
    code,
    platform: platform || null,
    expires_at: expiresAt,
  });

  return code;
}

/**
 * Redeem a link code from the bot side.
 * Creates the social_links row and marks the code as used.
 */
export async function redeemLinkCode(
  code: string,
  platform: SocialPlatform,
  platformUserId: string,
  platformUsername?: string | null,
  displayName?: string | null
): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  const service = createServiceClient();
  const normalized = code.trim().toUpperCase();

  const { data: row } = await service
    .from("social_link_codes")
    .select("*")
    .eq("code", normalized)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!row) {
    return { success: false, error: "Invalid or expired code. Generate a new one on the website." };
  }

  if (row.platform && row.platform !== platform) {
    return { success: false, error: `This code is only valid for ${row.platform}.` };
  }

  // Check if this social identity is already linked to someone else
  const { data: existing } = await service
    .from("social_links")
    .select("user_id")
    .eq("platform", platform)
    .eq("platform_user_id", String(platformUserId))
    .maybeSingle();

  if (existing && existing.user_id !== row.user_id) {
    return {
      success: false,
      error: "This social account is already linked to a different TryyON user.",
    };
  }

  // Upsert the link
  const { error: linkError } = await service.from("social_links").upsert(
    {
      user_id: row.user_id,
      platform,
      platform_user_id: String(platformUserId),
      platform_username: platformUsername || null,
      display_name: displayName || null,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "platform,platform_user_id" }
  );

  if (linkError) {
    console.error("[social] link upsert error", linkError);
    return { success: false, error: "Failed to link account. Please try again." };
  }

  // Mark code as used
  await service
    .from("social_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { success: true, userId: row.user_id };
}

/** Human-friendly low-credit message */
export function lowCreditMessage(credits: number, needed: number): string {
  return (
    `You only have *${credits}* credits left.\n` +
    `This action needs *${needed}* credits.\n\n` +
    `Please recharge on the website first, then come back:\n` +
    `${process.env.NEXT_PUBLIC_APP_URL || "https://tryyon.app"}/profile`
  );
}

/** Snapshot cost helper */
export const BOT_SNAPSHOT_COST = CREDIT_COSTS.snapshot;
export const BOT_MIRROR_COST = CREDIT_COSTS.realtime_15s;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TRY-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
