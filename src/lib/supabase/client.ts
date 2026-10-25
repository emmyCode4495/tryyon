import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses cookies (via @supabase/ssr) so the session
 * is shared with middleware and server components.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "[tryyON] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(
    url || "https://placeholder.supabase.co",
    key || "placeholder-key",
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
      },
    }
  );
}
