/**
 * Shared Decart server helpers.
 */

/** Read DECART_API_KEY, tolerating stray whitespace/quotes pasted into env dashboards. */
export function getDecartApiKey(): string | undefined {
  const raw = process.env.DECART_API_KEY;
  if (!raw) return undefined;
  const key = raw.trim().replace(/^["']|["']$/g, "").trim();
  return key || undefined;
}

/** Origins a short-lived client token may be used from. */
export function getAllowedOrigins(requestOrigin?: string | null): string[] {
  const origins = new Set<string>(["http://localhost:3000"]);

  const add = (value?: string | null) => {
    if (!value) return;
    const v = value.trim();
    if (!v) return;
    try {
      origins.add(new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).origin);
    } catch {
      /* ignore malformed */
    }
  };

  add(process.env.NEXT_PUBLIC_APP_URL);
  add(process.env.VERCEL_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  add(requestOrigin); // the origin the browser actually called from (custom domains, previews)

  return [...origins];
}
