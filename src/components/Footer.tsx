import Logo from "./Logo";

const LINKS = [
  { href: "#try-on", label: "Try on" },
  { href: "#pricing", label: "Pricing" },
  { href: "#for-brands", label: "For brands" },
  { href: "#", label: "Privacy" },
  { href: "#", label: "Terms" },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 leading-relaxed text-ink-600">
              Virtual try-on for shoppers, vendors and fashion brands.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-3 text-sm text-ink-600">
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className="link-u w-fit hover:text-ink-900">
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <p className="mt-14 border-t border-ink-100 pt-6 text-sm text-ink-500">
          © 2026 tryyON. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
