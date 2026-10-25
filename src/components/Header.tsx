"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { cssVars } from "@/lib/css";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { id: "try-on", label: "Try on" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "for-brands", label: "For brands" },
] as const;

/** Credit wallet: the number rolls to its new value and a chip shows the change. */
function CreditsPill({
  credits,
  loading,
  onClick,
}: {
  credits: number | null;
  loading?: boolean;
  onClick?: () => void;
}) {
  const value = credits ?? 0;
  const shown = useAnimatedNumber(value);
  const [prev, setPrev] = useState(value);
  const [delta, setDelta] = useState<{ id: number; amount: number } | null>(null);

  if (value !== prev) {
    setPrev(value);
    setDelta((d) => ({ id: (d?.id ?? 0) + 1, amount: value - prev }));
  }

  useEffect(() => {
    if (!delta) return;
    const t = window.setTimeout(() => setDelta(null), 1700);
    return () => window.clearTimeout(t);
  }, [delta]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2 rounded-full bg-ink-900 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-white transition hover:bg-ink-800"
      aria-label={credits === null ? "Credits" : `${credits} credits`}
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-thread-500" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-ink-900" />
      </span>
      <span className="tabular-nums min-w-[1.25rem]" aria-hidden="true">
        {loading ? "…" : credits === null ? "—" : shown}
      </span>
      <span className="hidden text-xs font-normal text-ink-300 sm:inline" aria-hidden="true">
        credits
      </span>
      {delta && credits !== null && (
        <span
          key={delta.id}
          aria-hidden="true"
          className="credit-delta absolute right-2 top-full mt-2 rounded-full bg-thread-500 px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-950 shadow-md"
        >
          {delta.amount > 0 ? `+${delta.amount}` : `−${Math.abs(delta.amount)}`}
        </span>
      )}
    </button>
  );
}

export default function Header() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Auth + credits — avoid flash of "Sign in" while session loads
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("tryyon_auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { userId?: string };
      return parsed.userId ?? null;
    } catch {
      return null;
    }
  });
  const [credits, setCredits] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("tryyon_auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { credits?: number };
      return typeof parsed.credits === "number" ? parsed.credits : null;
    } catch {
      return null;
    }
  });
  // If we already restored a user from sessionStorage, don't treat UI as logged-out
  const [authLoading, setAuthLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return !sessionStorage.getItem("tryyon_auth");
    } catch {
      return true;
    }
  });

  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Persist lightweight auth snapshot so home nav doesn't flash signed-out
  function persistAuth(nextUserId: string | null, nextCredits: number | null) {
    try {
      if (!nextUserId) {
        sessionStorage.removeItem("tryyon_auth");
        return;
      }
      sessionStorage.setItem(
        "tryyon_auth",
        JSON.stringify({ userId: nextUserId, credits: nextCredits ?? 0 })
      );
    } catch {
      /* private mode etc. */
    }
  }

  // Load session + profile credits, subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function loadProfile(uid: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", uid)
        .single();
      const bal = profile?.credits ?? 0;
      if (cancelled) return;
      setCredits(bal);
      persistAuth(uid, bal);

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      channel = supabase
        .channel(`credits-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${uid}`,
          },
          (payload) => {
            const next = (payload.new as { credits?: number })?.credits;
            if (typeof next === "number") {
              setCredits(next);
              persistAuth(uid, next);
            }
          }
        )
        .subscribe();
    }

    async function init() {
      try {
        // getSession is fast (local cookies); getUser validates with server
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          if (!cancelled) {
            setUserId(session.user.id);
            setAuthLoading(false);
            persistAuth(session.user.id, credits);
          }
          await loadProfile(session.user.id);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setUserId(null);
          setCredits(null);
          persistAuth(null, null);
          setAuthLoading(false);
          return;
        }

        setUserId(user.id);
        setAuthLoading(false);
        await loadProfile(user.id);
      } catch {
        if (!cancelled) {
          setUserId(null);
          setCredits(null);
          persistAuth(null, null);
          setAuthLoading(false);
        }
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUserId(null);
        setCredits(null);
        persistAuth(null, null);
        setAuthLoading(false);
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
        return;
      }
      setUserId(session.user.id);
      setAuthLoading(false);
      persistAuth(session.user.id, credits);
      void loadProfile(session.user.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll progress for the measuring tape + "stuck" shadow
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      el.dataset.stuck = window.scrollY > 8 ? "true" : "false";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Which section is in the middle of the viewport
  useEffect(() => {
    const ids = ["top", ...NAV.map((n) => n.id)];
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id === "top" ? null : entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Slide the highlight pill under the hovered (or active) nav link
  useEffect(() => {
    const place = () => {
      const pill = pillRef.current;
      if (!pill) return;
      const id = hovered ?? active;
      const link = id ? linkRefs.current[id] : null;
      if (!link) {
        pill.style.opacity = "0";
        return;
      }
      const wasHidden = pill.style.opacity !== "1";
      pill.style.transition = wasHidden ? "opacity .25s ease" : "";
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.transform = `translateX(${link.offsetLeft}px)`;
      pill.style.opacity = "1";
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [hovered, active]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserId(null);
    setCredits(null);
    try {
      sessionStorage.removeItem("tryyon_auth");
    } catch {
      /* ignore */
    }
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  const isLoggedIn = !!userId;
  // While verifying session, never flash guest CTAs (layout jump / "Sign in")
  const showGuestCtas = !authLoading && !isLoggedIn;
  const showUserCtas = isLoggedIn;

  return (
    <header ref={headerRef} data-stuck="false" className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label="tryyON home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav
          className="relative hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          <span
            ref={pillRef}
            className="pointer-events-none absolute left-0 top-1/2 h-9 -translate-y-1/2 rounded-full bg-ink-900/[0.06] opacity-0 transition-all duration-300 ease-out"
            aria-hidden="true"
          />
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              ref={(el) => {
                linkRefs.current[item.id] = el;
              }}
              onMouseEnter={() => setHovered(item.id)}
              className="relative z-10 rounded-full px-3.5 py-2 text-sm font-medium text-ink-600 transition hover:text-ink-900"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right side — fixed min width so auth load doesn't distort layout */}
        <div className="flex min-w-[9.5rem] items-center justify-end gap-2 sm:min-w-[14rem] sm:gap-3">
          {(showUserCtas || authLoading) && (
            <CreditsPill
              credits={showUserCtas ? credits : null}
              loading={authLoading && credits === null}
              onClick={() => router.push("/studio")}
            />
          )}

          {authLoading && !showUserCtas ? (
            <>
              <span className="hidden h-10 w-20 animate-pulse rounded-full bg-ink-100 sm:inline-block" />
              <span className="hidden h-10 w-24 animate-pulse rounded-full bg-ink-100 md:inline-block" />
            </>
          ) : showUserCtas ? (
            <>
              <Link
                href="/studio"
                className="hidden h-10 items-center justify-center rounded-full bg-ink-900 px-5 text-sm font-semibold text-white transition duration-200 hover:bg-chalk-600 active:scale-[0.97] sm:inline-flex"
              >
                Studio
              </Link>
              <Link
                href="/profile"
                className="hidden h-10 items-center justify-center rounded-full px-3 text-sm font-medium text-ink-700 transition hover:bg-ink-900/[0.06] md:inline-flex"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="hidden h-10 items-center justify-center rounded-full border border-ink-200 px-4 text-sm font-medium text-ink-700 transition hover:bg-ink-50 sm:inline-flex"
              >
                Sign out
              </button>
            </>
          ) : showGuestCtas ? (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center justify-center rounded-full bg-ink-900 px-5 text-sm font-semibold text-white transition duration-200 hover:bg-chalk-600 active:scale-[0.97] sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden h-10 items-center justify-center rounded-full bg-thread-500 px-5 text-sm font-semibold text-ink-950 transition duration-200 hover:bg-thread-400 active:scale-[0.97] md:inline-flex"
              >
                Get started
              </Link>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full text-ink-900 transition hover:bg-ink-900/[0.07] md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <span className="relative block h-3.5 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300 ease-out ${
                  mobileOpen ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300 ease-out ${
                  mobileOpen ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div id="mobile-menu" className="collapse-y md:hidden" data-open={mobileOpen}>
        <div>
          <nav
            aria-label="Mobile"
            inert={!mobileOpen}
            className="mx-auto max-w-6xl space-y-1 px-4 pb-5 pt-1 sm:px-6"
          >
            {NAV.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileOpen(false)}
                style={cssVars({ transitionDelay: mobileOpen ? `${80 + i * 55}ms` : "0ms" })}
                className={`block rounded-xl px-3 py-3 font-display text-xl font-medium text-ink-900 transition duration-500 ease-out hover:bg-ink-900/[0.06] ${
                  mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                }`}
              >
                {item.label}
              </a>
            ))}

            {authLoading && !isLoggedIn ? (
              <div className="mt-3 h-12 w-full animate-pulse rounded-full bg-ink-100" />
            ) : isLoggedIn ? (
              <>
                <Link
                  href="/studio"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white"
                >
                  Open studio
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-900"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-2 flex h-12 w-full items-center justify-center rounded-full border border-ink-200 text-sm font-medium text-ink-700"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-thread-500 text-sm font-semibold text-ink-950"
                >
                  Get started free
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Measuring tape doubles as the scroll-progress indicator */}
      <div className="tape" aria-hidden="true">
        <div className="tape-fill" />
        <div className="tape-mark" />
      </div>
    </header>
  );
}
