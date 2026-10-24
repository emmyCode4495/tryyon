"use client";

import { useState } from "react";

interface HeaderProps {
  credits: number;
}

export default function Header({ credits }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-surface-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-xl font-bold tracking-tight">
              tryy<span className="text-brand-500">ON</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#try-on"
              className="text-sm font-medium text-surface-600 hover:text-surface-900 transition"
            >
              Try On
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-surface-600 hover:text-surface-900 transition"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-surface-600 hover:text-surface-900 transition"
            >
              Pricing
            </a>
            <a
              href="#for-brands"
              className="text-sm font-medium text-surface-600 hover:text-surface-900 transition"
            >
              For Brands
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="credit-badge text-white text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm hidden sm:flex">
              <svg
                className="w-4 h-4 text-brand-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.5 7.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM10 12a1 1 0 01-1-1v-1a1 1 0 012 0v1a1 1 0 01-1 1z" />
              </svg>
              <span>{credits}</span>
              <span className="text-surface-300 text-xs font-normal">
                credits
              </span>
            </div>

            <button className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-surface-900 rounded-lg hover:bg-surface-800 transition">
              Sign in
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-surface-600 hover:bg-surface-100 transition"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-surface-200 py-4 space-y-1">
            <a href="#try-on" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50 rounded-lg">
              Try On
            </a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50 rounded-lg">
              How it works
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50 rounded-lg">
              Pricing
            </a>
            <a href="#for-brands" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50 rounded-lg">
              For Brands
            </a>
            <div className="pt-3 mt-2 border-t border-surface-100 flex items-center justify-between px-3">
              <div className="credit-badge text-white text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span>{credits}</span>
                <span className="text-surface-300 text-xs">credits</span>
              </div>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-surface-900 rounded-lg">
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
