import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    path?: string;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    expires?: Date;
  };
};

/**
 * OAuth / magic-link callback.
 * Must write session cookies onto the *redirect response* so the session
 * survives navigation to /studio, /, pricing, etc.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/studio";
  if (!next.startsWith("/")) next = "/studio";

  if (code) {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.redirect(`${origin}/login?error=config`);
    }

    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              /* ignore if read-only in some contexts */
            }
            response.cookies.set(name, value, {
              ...options,
              path: options?.path ?? "/",
              sameSite:
                options?.sameSite === true
                  ? "strict"
                  : options?.sameSite === false
                    ? "none"
                    : (options?.sameSite ?? "lax"),
            });
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error("[auth/callback]", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
