# tryyON

Virtual try-on platform built with **Next.js 15**, TypeScript, and Tailwind CSS v4.

A standard modern responsive website (desktop + mobile).

## Features (Phase 1)

- Clean top navigation bar with mobile hamburger menu
- Full-width responsive layout (max-w-6xl)
- Hero section + Try-On tool + How it works + Pricing + For Brands
- Credit wallet in the header
- Dual image upload with drag-and-drop
- Simulated generation (ready for Decart API)
- Inter font via `next/font`

## Getting Started

```bash
unzip tryyon-nextjs.zip
cd tryyon-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Inter font

## Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          # Full website
└── components/
    ├── Header.tsx        # Top nav + mobile menu + credits
    └── UploadZone.tsx
```

## Credit System

| Action                        | Credits |
|-------------------------------|---------|
| Snapshot try-on (image)       | 2       |
| 5-second try-on clip          | 20      |
| Realtime mirror (15s session) | 30      |

## Next Steps

1. Connect real Decart image / VTON endpoint
2. Auth + persistent credit ledger
3. Stripe for plans
4. Short clips (Phase 2)
5. Realtime mirror (Phase 3)
6. B2B embed (Phase 4)
