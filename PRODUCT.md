# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Thai online sellers, TikTok Affiliate creators, and everyday beginners across all age groups—including non-technical and older learners who primarily use smartphones. They need large, unmistakable touch targets, plain Thai instructions without technical jargon, and a one-time lifetime purchase with no recurring subscriptions.

## Product Purpose
PUP PAP AI ("คิดปุ๊บ คลิปปั๊บ") is an all-in-one AI video creation toolkit and online creator academy. It enables creators to produce high-converting product videos (TikTok, Shopee Video, Facebook Reels, YouTube Shorts) using ready-to-run Google Flow AI tools alongside a 16-lesson hands-on video course ("ปั้นนายหน้า TikTok ด้วย AI ปักตะกร้า").

## Positioning
Unlike subscription-heavy SaaS video editors or theory-only online courses, PUP PAP AI pairs a 16-lesson practical curriculum directly with pre-built Google Flow automation tools under a single one-time lifetime license (`ซื้อขาดตลอดชีพ ไม่มีรายเดือน`).

## Operating Context
Members sign in with Google OAuth (Gmail) on mobile or desktop, watch 16:9 landscape lessons in the protected Course Studio, and launch linked Google Flow tools in one tap to generate scripts, images, and videos for e-commerce affiliate links. Payments are verified via Thai bank transfer slip upload with automated license activation.

## Capabilities and Constraints
- **Stack**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (Auth, Database, Storage).
- **Protected Course Studio**: Uses `youtube-nocookie.com` embeds with invisible top/bottom click shields, right-click prevention, a fixed student email watermark, and a custom Smart Fullscreen controller.
- **Trial & CRM Flow**: Supports 3-clip free trials (`user_trials`) and slip-based order verification (`orders`, `license_keys`, `user_tools`).

## Brand Commitments
- **Name & Tagline**: PUP PAP AI — คิดปุ๊บ คลิปปั๊บ ขายได้ทุกแพลตฟอร์ม.
- **Dual Theme Identity**: Warm Cream Paper default (`cream`, `#EDE6D6`) paired with Minimalist Obsidian Dark (`dark`, `#0F0F12`), crimson/vermilion accent (`#A82D24` / `#DC2626`), and tactile `1.5px` structural borders.

## Evidence on Hand
- Brand mascot & logo at `/images/logo-puppap-ai.png` and tool posters in `/images/`.
- Live tool catalog, 16-lesson course curriculum, and member/trial records stored in Supabase (`tools`, `orders`, `user_tools`, `user_trials`).

## Product Principles
1. **Zero-Friction for All Ages**: Every primary action must be immediately obvious to non-technical users on a mobile screen—one-click Google login, single-button classroom entry, and clear step-by-step guidance.
2. **Tool + Training Unity**: Every practical lesson connects directly to a working Flow Tool so students produce real sales videos while learning.
3. **Honest Lifetime Ownership**: Present pricing, trial limits, and lifetime access transparently without hidden recurring fees or dark patterns.
4. **High-Contrast Legibility First**: Maintain WCAG AA contrast (`>= 4.5:1`) and generous Thai typography (`>= 12px` labels, `>= 14px` body copy) across both Cream and Dark themes.

## Accessibility & Inclusion
WCAG AA contrast compliance (`>= 4.5:1`) across all surfaces, minimum `12px` (`text-xs`) UI labels, minimum `14px` (`text-sm`) body descriptions, keyboard-visible focus rings, and touch-friendly button targets for older and mobile-first learners.
