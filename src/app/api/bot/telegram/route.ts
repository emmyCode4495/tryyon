import { NextResponse } from "next/server";
import {
  getUserBySocial,
  redeemLinkCode,
  spendCreditsForSocialUser,
  lowCreditMessage,
  BOT_SNAPSHOT_COST,
  BOT_MIRROR_COST,
} from "@/lib/social";
import { createServiceClient } from "@/lib/supabase/server";
import { getDecartApiKey } from "@/lib/decart";
import { CREDIT_COSTS } from "@/lib/credits";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tryyon.app";

// Simple in-memory session state for multi-step flows (person photo → garment photo)
// In production you should move this to Redis / Supabase
const pendingSessions = new Map<
  string,
  { step: "awaiting_person" | "awaiting_garment"; personFileId?: string }
>();

export async function POST(request: Request) {
  if (!BOT_TOKEN) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN not set");
    return NextResponse.json({ ok: true }); // always 200 so Telegram doesn't retry forever
  }

  try {
    const update = await request.json();
    await handleUpdate(update);
  } catch (err) {
    console.error("[telegram] unhandled error", err);
  }

  return NextResponse.json({ ok: true });
}

async function handleUpdate(update: any) {
  const message = update.message || update.edited_message;
  if (!message) return;

  const chatId = message.chat.id;
  const from = message.from;
  if (!from || from.is_bot) return;

  const platformUserId = String(from.id);
  const username = from.username || null;
  const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ") || null;
  const text: string = (message.text || "").trim();
  const caption: string = (message.caption || "").trim();

  // ─── /start ───────────────────────────────────────────────
  if (text.startsWith("/start")) {
    const user = await getUserBySocial("telegram", platformUserId);

    if (user) {
      await sendMessage(
        chatId,
        `Welcome back${user.fullName ? `, ${user.fullName}` : ""}!\n\n` +
          `Your balance: *${user.credits}* credits\n\n` +
          `Send me two photos:\n` +
          `1. A clear photo of *you*\n` +
          `2. A photo of the *garment*\n\n` +
          `Or send /mirror to get a live Realtime Mirror link.\n` +
          `Send /balance anytime to check credits.`
      );
    } else {
      await sendMessage(
        chatId,
        `Welcome to *tryyON* 👋\n\n` +
          `To use the bot you must first link your TryyON account.\n\n` +
          `1. Go to ${APP_URL}/profile\n` +
          `2. Click *Link Telegram*\n` +
          `3. Copy the code and send it here\n\n` +
          `Example: \`TRY-8F3K2A\``
      );
    }
    return;
  }

  // ─── Link code (TRY-XXXXXX) ───────────────────────────────
  if (/^TRY-[A-Z0-9]{6}$/i.test(text)) {
    const result = await redeemLinkCode(
      text,
      "telegram",
      platformUserId,
      username,
      displayName
    );

    if (result.success) {
      const user = await getUserBySocial("telegram", platformUserId);
      await sendMessage(
        chatId,
        `Account linked successfully!\n\n` +
          `Balance: *${user?.credits ?? 0}* credits\n\n` +
          `You can now send photos for try-on or use /mirror.`
      );
    } else {
      await sendMessage(chatId, result.error);
    }
    return;
  }

  // ─── /balance ─────────────────────────────────────────────
  if (text === "/balance" || text === "/credits") {
    const user = await getUserBySocial("telegram", platformUserId);
    if (!user) {
      await sendMessage(chatId, "Your Telegram is not linked yet. Send /start to begin.");
      return;
    }
    await sendMessage(
      chatId,
      `Balance: *${user.credits}* credits\n` +
        `Plan: ${user.plan}\n\n` +
        `Snapshot try-on: ${BOT_SNAPSHOT_COST} credits\n` +
        `Realtime Mirror (15s): ${BOT_MIRROR_COST} credits\n\n` +
        `Recharge → ${APP_URL}/profile`
    );
    return;
  }

  // ─── /mirror ──────────────────────────────────────────────
  if (text === "/mirror" || text.startsWith("/mirror")) {
    const user = await getUserBySocial("telegram", platformUserId);
    if (!user) {
      await sendMessage(chatId, "Please link your account first. Send /start.");
      return;
    }

    if (user.credits < BOT_MIRROR_COST) {
      await sendMessage(chatId, lowCreditMessage(user.credits, BOT_MIRROR_COST));
      return;
    }

    // Create a short-lived signed session token so the web mirror page knows who + that they came from bot
    const token = await createMirrorToken(user.userId);

    await sendMessage(
      chatId,
      `Ready for live Realtime Mirror.\n\n` +
        `Cost: *${BOT_MIRROR_COST}* credits (charged when the session starts)\n` +
        `Your balance: *${user.credits}* credits\n\n` +
        `Open this link on your phone:\n` +
        `${APP_URL}/studio?mirror=1&token=${token}\n\n` +
        `Upload a garment there and start the live session.`
    );
    return;
  }

  // ─── Photo handling (snapshot try-on) ─────────────────────
  const photos = message.photo;
  if (photos && photos.length > 0) {
    const user = await getUserBySocial("telegram", platformUserId);
    if (!user) {
      await sendMessage(chatId, "Please link your account first. Send /start.");
      return;
    }

    // Best quality photo is the last one
    const fileId = photos[photos.length - 1].file_id;
    const sessionKey = platformUserId;
    const session = pendingSessions.get(sessionKey);

    if (!session || session.step === "awaiting_person") {
      // First photo = person
      pendingSessions.set(sessionKey, {
        step: "awaiting_garment",
        personFileId: fileId,
      });
      await sendMessage(
        chatId,
        `Got your photo.\n\nNow send a clear photo of the *garment* you want to try on.`
      );
      return;
    }

    if (session.step === "awaiting_garment" && session.personFileId) {
      // Second photo = garment → run try-on
      pendingSessions.delete(sessionKey);

      if (user.credits < BOT_SNAPSHOT_COST) {
        await sendMessage(chatId, lowCreditMessage(user.credits, BOT_SNAPSHOT_COST));
        return;
      }

      await sendMessage(chatId, `Generating try-on… (${BOT_SNAPSHOT_COST} credits)`);

      try {
        const personUrl = await getTelegramFileUrl(session.personFileId);
        const garmentUrl = await getTelegramFileUrl(fileId);

        if (!personUrl || !garmentUrl) {
          await sendMessage(chatId, "Could not download the photos. Please try again.");
          return;
        }

        const result = await runSnapshotTryOn(user.userId, personUrl, garmentUrl);

        if ("error" in result) {
          if (result.error === "Insufficient credits") {
            await sendMessage(chatId, lowCreditMessage(result.credits, BOT_SNAPSHOT_COST));
          } else {
            await sendMessage(chatId, `Try-on failed: ${result.error}`);
          }
          return;
        }

        // Send the result image back
        await sendPhoto(chatId, result.imageUrl, `Done! New balance: *${result.credits}* credits`);
      } catch (err) {
        console.error("[telegram] try-on error", err);
        await sendMessage(chatId, "Something went wrong while generating. Please try again later.");
      }
      return;
    }
  }

  // ─── Fallback ─────────────────────────────────────────────
  await sendMessage(
    chatId,
    `I didn't understand that.\n\n` +
      `• Send /start to begin\n` +
      `• Send two photos (you + garment) for snapshot try-on\n` +
      `• /mirror — get a live Realtime Mirror link\n` +
      `• /balance — check your credits`
  );
}

// ────────────────────── Helpers ──────────────────────────────

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    }),
  });
}

async function sendPhoto(chatId: number | string, photoUrl: string, caption?: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "Markdown",
    }),
  });
}

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const data = await res.json();
  if (!data.ok || !data.result?.file_path) return null;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
}

/**
 * Create a short-lived token so the web /studio page can identify the user
 * when they open the mirror link from Telegram.
 * For now we store it in a simple table or just sign it.
 * Simple version: store in social_link_codes style temporary table or just return a signed JWT-like string.
 */
async function createMirrorToken(userId: string): Promise<string> {
  // Lightweight approach: reuse social_link_codes table with a special prefix
  const service = createServiceClient();
  const token = `MIR-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

  await service.from("social_link_codes").insert({
    user_id: userId,
    code: token,
    platform: "telegram",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  });

  return token;
}

/**
 * Run the actual snapshot try-on using the same Decart flow as the website.
 * Deducts credits only on success.
 */
async function runSnapshotTryOn(
  userId: string,
  personUrl: string,
  garmentUrl: string
): Promise<{ imageUrl: string; credits: number } | { error: string; credits: number }> {
  const apiKey = getDecartApiKey();
  if (!apiKey) {
    return { error: "Try-on service is temporarily unavailable", credits: 0 };
  }

  // Download both images
  const [personRes, garmentRes] = await Promise.all([
    fetch(personUrl),
    fetch(garmentUrl),
  ]);

  if (!personRes.ok || !garmentRes.ok) {
    return { error: "Failed to download photos", credits: 0 };
  }

  const personBlob = await personRes.blob();
  const garmentBlob = await garmentRes.blob();

  const form = new FormData();
  form.append("data", personBlob, "person.jpg");
  form.append("reference_image", garmentBlob, "garment.jpg");
  form.append(
    "prompt",
    "Substitute the person's clothing with the garment shown in the reference image. Keep face, body, pose, and background unchanged."
  );

  // Try the same endpoints the main /api/tryon uses
  const endpoints = [
    "https://api.decart.ai/v1/generate/lucy-image-2",
    "https://api.decart.ai/v1/generate/lucy-image-latest",
  ];

  let imageUrl: string | null = null;
  let lastError = "Generation failed";

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      });

      if (!res.ok) {
        lastError = `Decart ${res.status}`;
        continue;
      }

      const data = await res.json();
      // Decart responses vary; try common shapes
      imageUrl =
        data?.output_url ||
        data?.url ||
        data?.images?.[0]?.url ||
        data?.data?.[0]?.url ||
        null;

      if (imageUrl) break;
    } catch (e) {
      lastError = String(e);
    }
  }

  if (!imageUrl) {
    return { error: lastError, credits: 0 };
  }

  // Only now deduct credits
  const spendResult = await spendCreditsForSocialUser(
    userId,
    BOT_SNAPSHOT_COST,
    "tryon_snapshot_bot",
    { platform: "telegram" }
  );

  if ("error" in spendResult) {
    return { error: spendResult.error, credits: spendResult.credits };
  }

  return { imageUrl, credits: spendResult.credits };
}
