"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TryOnStudio from "@/components/TryOnStudio";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import ForBrands from "@/components/ForBrands";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [credits, setCredits] = useState(10);

  return (
    <div className="min-h-screen bg-ink-50">
      <a
        href="#try-on"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink-900 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to try-on
      </a>

      <Header credits={credits} />

      <main>
        <Hero />
        <TryOnStudio
          credits={credits}
          onSpend={(amount) => setCredits((c) => Math.max(0, c - amount))}
        />
        <HowItWorks />
        <Pricing />
        <ForBrands />
      </main>

      <Footer />
    </div>
  );
}
