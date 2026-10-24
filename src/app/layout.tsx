import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--nf-display",
  display: "swap",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--nf-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "tryyON — Virtual Try-On",
  description: "Try on clothes instantly. Snapshots, clips, and live mirror.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "tryyON",
  },
};

// Pinch-zoom is intentionally left enabled (the old config disabled it,
// which fails accessibility guidelines).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0e2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
