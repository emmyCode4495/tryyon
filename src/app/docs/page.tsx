import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import CodeLines from "@/components/merchant/CodeLines";
import { eventsLines, snippetLines } from "@/lib/embed";

export const metadata: Metadata = {
  title: "Embed documentation — tryyON",
  description: "Add virtual try-on to your product pages with one iframe.",
};

const PARAMS = [
  { name: "merchant", req: "Required", body: "Your store key from the merchant dashboard. Identifies whose credits are used." },
  { name: "garment", req: "Required", body: "URL of the product image, URL-encoded. Use a clear, front-facing shot on a plain background." },
  { name: "product_id", req: "Optional", body: "Your SKU or product ID. Shows up in your usage list and in the events below." },
  { name: "color", req: "Optional", body: "Button colour as a hex value, URL-encoded (for example %234c5cff). Defaults to tryyON blue." },
];

const STEPS = [
  { title: "Create your store", body: "Open the merchant dashboard and set up your store. You get a store key and a starting credit allowance." },
  { title: "Copy the snippet", body: "Set the product image, product ID and colour in the dashboard, then copy the generated iframe." },
  { title: "Paste it into your product page", body: "Put it wherever the try-on should sit. It works in any platform that lets you add custom HTML." },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink-200 py-12 first:border-t-0 first:pt-0">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-900">{title}</h2>
      <div className="mt-5 space-y-5 text-ink-600">{children}</div>
    </section>
  );
}

function Code({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-ink-950 px-3 py-4">
      <CodeLines lines={lines} />
    </div>
  );
}

const NAV = [
  ["quick-start", "Quick start"],
  ["parameters", "Parameters"],
  ["events", "Events"],
  ["credits", "Credits"],
  ["troubleshooting", "Troubleshooting"],
] as const;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-5 text-sm font-medium">
            <Link href="/#for-brands" className="link-u text-ink-600 hover:text-ink-900">
              For brands
            </Link>
            <Link href="/merchant" className="rounded-full bg-ink-900 px-4 py-1.5 text-white transition hover:bg-chalk-600">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-12 px-4 py-12 sm:py-16 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 space-y-2 text-sm">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="link-u block w-fit text-ink-600 hover:text-ink-900">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl">
          <div className="rise mb-12">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Embed try-on
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-600">
              One iframe puts virtual try-on on any product page. Shoppers add a photo and see the garment on
              themselves; you pay in credits only when they do.
            </p>
          </div>

          <Section id="quick-start" title="Quick start">
            <ol className="space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-chalk-500 font-display text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <p>
                    <span className="block font-semibold text-ink-900">{s.title}</span>
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
            <Code lines={snippetLines({ slug: "YOUR_STORE_KEY" })} />
            <p>
              The dashboard fills in your real store key and lets you preview the result before you copy.{" "}
              <Link href="/merchant" className="font-semibold text-chalk-600 hover:text-chalk-700">
                Open the dashboard
              </Link>
              .
            </p>
          </Section>

          <Section id="parameters" title="Parameters">
            <p>Set these as query parameters on the iframe&rsquo;s <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-800">src</code>.</p>
            <dl className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
              {PARAMS.map((p) => (
                <div key={p.name} className="grid gap-1 p-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="font-mono text-sm font-semibold text-ink-900">
                    {p.name}
                    <span className="ml-2 font-sans text-xs font-normal text-ink-400">{p.req}</span>
                  </dt>
                  <dd className="text-sm">{p.body}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="events" title="Events">
            <p>
              The embed sends messages to your page so you can track what happens. <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-800">tryyon:ready</code>{" "}
              fires when it loads. <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-800">tryyon:result</code> fires after each try-on, with{" "}
              <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-800">ok</code> set to true or false.
            </p>
            <Code lines={eventsLines()} />
          </Section>

          <Section id="credits" title="Credits">
            <p>
              Each shopper try-on costs 2 credits from your store&rsquo;s balance, not the shopper&rsquo;s. Your
              balance and recent try-ons are on the dashboard. When the balance runs out, shoppers see a message
              asking them to contact the store, so top up before that happens.
            </p>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="font-semibold text-ink-900">&ldquo;Could not load garment image&rdquo;.</span> The
                embed fetches the product image in the shopper&rsquo;s browser, so the host serving it must allow
                cross-origin requests (an <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-800">Access-Control-Allow-Origin</code> header).
                Most CDNs have a setting for this.
              </li>
              <li>
                <span className="font-semibold text-ink-900">Camera doesn&rsquo;t open on mobile.</span> Keep{" "}
                <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-800">allow=&quot;camera&quot;</code> on the iframe. Shoppers can
                always upload a photo instead.
              </li>
              <li>
                <span className="font-semibold text-ink-900">&ldquo;Unknown merchant&rdquo;.</span> Check the{" "}
                <code className="rounded bg-ink-100 px-1 py-0.5 text-ink-800">merchant</code> value matches the store key on your dashboard exactly.
              </li>
            </ul>
            <p>
              Still stuck?{" "}
              <Link href="/#for-brands" className="font-semibold text-chalk-600 hover:text-chalk-700">
                Talk to us
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
