import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a no-op-ish client shape only for missing env during local UI work.
    // Real auth will fail clearly until .env.local is filled.
    console.warn(
      "[tryyON] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(
    url || "https://placeholder.supabase.co",
    key || "placeholder-key"
  );
}
