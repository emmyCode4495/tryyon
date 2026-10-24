"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { cssVars } from "@/lib/css";

const NAV = [
  { id: "try-on", label: "Try on" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "for-brands", label: "For brands" },
] as const;

interface HeaderProps {
  credits: number;
}

/** Credit wallet: the number rolls to its new value and a chip shows the change. */
function CreditsPill({ credits }: { credits: number }) {
  const shown = useAnimatedNumber(credits);
  const [prev, setPrev] = useState(credits);
  const [delta, setDelta] = useState<{ id: number; amount: number } | null>(null);

  if (credits !== prev) {
    setPrev(credits);
    setDelta((d) => ({ id: (d?.id ?? 0) + 1, amount: credits - prev }));
  }

  useEffect(() => {
    if (!delta) return;
    const t = window.setTimeout(() => setDelta(null), 1700);
    return () => window.clearTimeout(t);
  }, [delta]);

  return (
    <div
      className="relative flex items-center gap-2 rounded-full bg-ink-900 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-white"
      aria-label={`${credits} credits`}
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-thread-500" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-ink-900" />
      </span>
      <span className="tabular-nums" aria-hidden="true">
        {shown}
      </span>
      <span className="hidden text-xs font-normal text-ink-300 sm:inline" aria-hidden="true">
        credits
      </span>
      {delta && (
        <span
          key={delta.id}
          aria-hidden="true"
          className="credit-delta absolute right-2 top-full mt-2 rounded-full bg-thread-500 px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-950 shadow-md"
        >
          {delta.amount > 0 ? `+${delta.amount}` : `−${Math.abs(delta.amount)}`}
        </span>
      )}
    </div>
  );
}

export default function Header({ credits }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Scroll progress for the measuring tape + "stuck" shadow.
  // Written straight to the DOM so scrolling never re-renders React.
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
      // First appearance fades in place instead of sliding from the left edge
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

  return (
    <header ref={headerRef} data-stuck="false" className="site-header sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="shrink-0 rounded-md" aria-label="tryyON home">
          <Logo />
        </a>

        {/* Desktop navigation */}
        <nav
          aria-label="Main"
          className="relative hidden items-center rounded-full p-1 md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          <span
            ref={pillRef}
            aria-hidden="true"
            className="nav-pill absolute left-0 top-1 bottom-1 rounded-full bg-ink-900/[0.07] opacity-0"
          />
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              ref={(el) => {
                linkRefs.current[item.id] = el;
              }}
              onMouseEnter={() => setHovered(item.id)}
              onFocus={() => setHovered(item.id)}
              onBlur={() => setHovered(null)}
              aria-current={active === item.id ? "location" : undefined}
              className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                active === item.id || hovered === item.id
                  ? "text-ink-900"
                  : "text-ink-600"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CreditsPill credits={credits} />

          <button
            type="button"
            className="hidden h-10 items-center justify-center rounded-full bg-ink-900 px-5 text-sm font-semibold text-white transition duration-200 hover:bg-chalk-600 active:scale-[0.97] sm:inline-flex"
          >
            Sign in
          </button>

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
            <button
              type="button"
              className="mt-3 h-12 w-full rounded-full bg-ink-900 text-sm font-semibold text-white sm:hidden"
            >
              Sign in
            </button>
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
