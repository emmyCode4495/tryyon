import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_COOLDOWN_SECONDS = 60;
export const OTP_HOURLY_CAP = 5;

/** Random 6-digit code, zero-padded. Uses a CSPRNG, not Math.random. */
export function generateCode() {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

function secret() {
  const s = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("OTP_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not set");
  return s;
}

/** HMAC bound to the email, so a code can't be replayed against another account. */
export function hashCode(email: string, code: string) {
  return createHmac("sha256", secret()).update(`${email}:${code}`).digest("hex");
}

export function codeMatches(email: string, code: string, storedHash: string) {
  const a = Buffer.from(hashCode(email, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
