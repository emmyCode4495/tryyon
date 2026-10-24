"use client";

import { useState } from "react";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";

export default function HomePage() {
  const [credits, setCredits] = useState(10);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const canGenerate = personFile && garmentFile && credits >= 2 && !isGenerating;

  const handlePersonSelect = (file: File) => {
    setPersonFile(file);
    setPersonPreview(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const handleGarmentSelect = (file: File) => {
    setGarmentFile(file);
    setGarmentPreview(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    setCredits((c) => c - 2);
    setResultUrl(personPreview);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <Header credits={credits} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-surface-900 leading-tight">
              Try on clothes
              <span className="block text-brand-500">instantly</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-surface-600 leading-relaxed max-w-2xl mx-auto">
              Upload a photo of yourself and any garment. Get a realistic try-on
              snapshot in seconds. Perfect for shoppers, vendors, and brands.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#try-on"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white btn-primary rounded-xl shadow-lg shadow-brand-500/25 hover:opacity-95 transition"
              >
                Start trying on
              </a>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-surface-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Try-On Section */}
      <section id="try-on" className="py-16 sm:py-24 bg-white border-y border-surface-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-surface-900">
              Create your try-on
            </h2>
            <p className="mt-3 text-surface-600 max-w-xl mx-auto">
              Two photos is all you need. Works on any device.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-5 mb-8">
              <UploadZone
                label="Your photo"
                placeholder="Upload your photo"
                icon="person"
                onFileSelect={handlePersonSelect}
                previewUrl={personPreview}
              />
              <UploadZone
                label="Garment"
                placeholder="Upload clothing item"
                icon="garment"
                onFileSelect={handleGarmentSelect}
                previewUrl={garmentPreview}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full btn-primary text-white font-semibold py-4 rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-base"
            >
              {isGenerating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate try-on · 2 credits
                </>
              )}
            </button>

            {resultUrl && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-800">Your result</h3>
                  <span className="text-sm text-surface-500">2 credits used</span>
                </div>
                <div className="bg-surface-50 rounded-2xl overflow-hidden border border-surface-200 shadow-sm">
                  <img
                    src={resultUrl}
                    className="w-full max-h-[520px] object-contain bg-white"
                    alt="Try-on result"
                  />
                  <div className="p-5 flex flex-col sm:flex-row gap-3">
                    <button className="flex-1 bg-white border border-surface-200 text-surface-800 font-medium py-3 rounded-xl text-sm hover:bg-surface-50 transition">
                      Download
                    </button>
                    <button className="flex-1 bg-surface-900 text-white font-medium py-3 rounded-xl text-sm hover:bg-surface-800 transition">
                      Share
                    </button>
                  </div>
                </div>

                <div className="mt-5 p-5 bg-brand-50 rounded-2xl border border-brand-100">
                  <p className="text-sm font-medium text-brand-800 mb-1">
                    Want a short video?
                  </p>
                  <p className="text-sm text-brand-600 mb-4">
                    Turn this into a 5-second clip perfect for Instagram or WhatsApp Status.
                  </p>
                  <button className="w-full sm:w-auto bg-brand-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-700 transition">
                    Generate clip · 20 credits
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-surface-900">
              How it works
            </h2>
            <p className="mt-3 text-surface-600 max-w-xl mx-auto">
              Simple, fast, and works on any connection.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
                <span className="text-2xl font-bold text-brand-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">
                Upload two photos
              </h3>
              <p className="text-surface-600 text-sm leading-relaxed">
                Your photo and the garment you want to try. Drag & drop or select from your device.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
                <span className="text-2xl font-bold text-brand-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">
                Generate in seconds
              </h3>
              <p className="text-surface-600 text-sm leading-relaxed">
                Our AI creates a realistic try-on snapshot. Uses only 2 credits.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
                <span className="text-2xl font-bold text-brand-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">
                Download or share
              </h3>
              <p className="text-surface-600 text-sm leading-relaxed">
                Save the image or turn it into a short clip for social media.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24 bg-white border-y border-surface-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-surface-900">
              Simple credit plans
            </h2>
            <p className="mt-3 text-surface-600 max-w-xl mx-auto">
              One credit system for snapshots, clips, and realtime. No surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-surface-900">Free</h3>
              <p className="mt-1 text-sm text-surface-500">Try it out</p>
              <p className="mt-6">
                <span className="text-4xl font-bold text-surface-900">$0</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-surface-600">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  10 credits (5 snapshots)
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Watermarked results
                </li>
              </ul>
              <button className="mt-8 w-full py-3 rounded-xl border border-surface-300 text-surface-700 font-medium text-sm hover:bg-white transition">
                Current plan
              </button>
            </div>

            <div className="rounded-2xl border-2 border-brand-500 bg-white p-6 sm:p-8 relative shadow-lg shadow-brand-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Popular
              </div>
              <h3 className="text-lg font-semibold text-surface-900">Shopper</h3>
              <p className="mt-1 text-sm text-surface-500">For everyday use</p>
              <p className="mt-6">
                <span className="text-4xl font-bold text-surface-900">$6</span>
                <span className="text-surface-500 text-sm">/month</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-surface-600">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  200 credits / month
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No watermarks
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Download & share
                </li>
              </ul>
              <button className="mt-8 w-full py-3 rounded-xl btn-primary text-white font-semibold text-sm hover:opacity-95 transition">
                Get Shopper
              </button>
            </div>

            <div className="rounded-2xl border border-surface-200 bg-surface-900 text-white p-6 sm:p-8">
              <h3 className="text-lg font-semibold">Vendor</h3>
              <p className="mt-1 text-sm text-surface-400">For sellers & creators</p>
              <p className="mt-6">
                <span className="text-4xl font-bold">$24</span>
                <span className="text-surface-400 text-sm">/month</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-surface-300">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  800 credits / month
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Short clips & exports
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority generation
                </li>
              </ul>
              <button className="mt-8 w-full py-3 rounded-xl bg-white text-surface-900 font-semibold text-sm hover:bg-surface-100 transition">
                Get Vendor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* For Brands */}
      <section id="for-brands" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-surface-900 rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Built for fashion brands
              </h2>
              <p className="mt-4 text-surface-300 text-lg leading-relaxed">
                Embed try-on on your product pages. Increase conversion and reduce returns with realistic virtual fitting.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button className="w-full sm:w-auto px-8 py-3.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition">
                  Talk to us
                </button>
                <button className="w-full sm:w-auto px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition border border-white/20">
                  View documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight">
                tryy<span className="text-brand-500">ON</span>
              </span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-surface-500">
              <a href="#try-on" className="hover:text-surface-900 transition">Try On</a>
              <a href="#pricing" className="hover:text-surface-900 transition">Pricing</a>
              <a href="#for-brands" className="hover:text-surface-900 transition">For Brands</a>
              <a href="#" className="hover:text-surface-900 transition">Privacy</a>
              <a href="#" className="hover:text-surface-900 transition">Terms</a>
            </nav>
            <p className="text-sm text-surface-400">
              © 2026 tryyON. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
