export const DEFAULT_BRAND = "#4c5cff";

export type EmbedOptions = {
  slug: string;
  garment?: string;
  productId?: string;
  color?: string;
};

export function appOrigin() {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env && !env.includes("localhost")) return env;
  if (typeof window !== "undefined") {
    const o = window.location.origin;
    if (!o.includes("localhost")) return o;
  }
  return "https://www.tryyon.store";
}

/** Accepts #rgb, #rrggbb (with or without #). Anything else falls back to the default. */
export function safeColor(input: string | null | undefined, fallback = DEFAULT_BRAND) {
  const v = (input || "").trim().replace(/^#/, "");
  return /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? `#${v.toLowerCase()}` : fallback;
}

/** Query string shared by the snippet and the live preview. */
export function embedQuery({ slug, garment, productId, color }: EmbedOptions) {
  const parts = [
    `merchant=${encodeURIComponent(slug)}`,
    `garment=${garment?.trim() ? encodeURIComponent(garment.trim()) : "YOUR_PRODUCT_IMAGE_URL"}`,
    `product_id=${encodeURIComponent(productId?.trim() || "SKU123")}`,
  ];
  const c = safeColor(color);
  if (c !== DEFAULT_BRAND) parts.push(`color=${encodeURIComponent(c)}`);
  return parts.join("&");
}

/** The iframe snippet, one entry per line so the UI can animate line by line. */
export function snippetLines(opts: EmbedOptions): string[] {
  return [
    "<iframe",
    `  src="${appOrigin()}/embed?${embedQuery(opts)}"`,
    '  style="width:100%;max-width:420px;height:640px;border:0;border-radius:16px"',
    '  allow="camera"',
    '  title="tryyON virtual try-on"',
    "></iframe>",
  ];
}

export function eventsLines(): string[] {
  return [
    "<script>",
    '  window.addEventListener("message", (e) => {',
    '    if (e.data?.type === "tryyon:ready") {',
    '      console.log("Try-on loaded", e.data.productId);',
    "    }",
    '    if (e.data?.type === "tryyon:result") {',
    '      console.log("Shopper tried it on", e.data.productId);',
    "    }",
    "  });",
    "</script>",
  ];
}
