---
name: PUP PAP AI
description: Warm Editorial Paper & Obsidian Studio design system for Thai AI video creators
colors:
  crimson-accent: "#A82D24"
  crimson-accent-dark: "#DC2626"
  cream-paper: "#EDE6D6"
  cream-secondary: "#E3DCB8"
  cream-deep: "#F5EFE3"
  card-white: "#FFFFFF"
  obsidian-canvas: "#0F0F12"
  obsidian-card: "#18181E"
  charcoal-ink: "#1C1917"
  stone-secondary: "#44403C"
  stone-muted: "#57534E"
typography:
  display:
    fontFamily: "Prompt, Kanit, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: "900"
    lineHeight: "1.15"
  headline:
    fontFamily: "Prompt, Kanit, sans-serif"
    fontSize: "1.5rem"
    fontWeight: "800"
    lineHeight: "1.25"
  title:
    fontFamily: "Prompt, Kanit, sans-serif"
    fontSize: "1.125rem"
    fontWeight: "700"
    lineHeight: "1.35"
  body:
    fontFamily: "Prompt, Kanit, sans-serif"
    fontSize: "0.875rem"
    fontWeight: "400"
    lineHeight: "1.6"
  label:
    fontFamily: "Prompt, JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: "700"
    lineHeight: "1.4"
rounded:
  sm: "14px"
  lg: "20px"
  pill: "9999px"
---

# Design System: PUP PAP AI

## Overview

**Creative North Star: "The Tactile Creator Workshop"**

PUP PAP AI ("คิดปุ๊บ คลิปปั๊บ") pairs a warm, approachable **Cream Paper** default workspace (`#EDE6D6`) with a **Minimalist Obsidian** dark studio (`#0F0F12`). Designed for Thai e-commerce sellers and affiliate creators of all ages, the interface favors crisp `1.5px` structural borders, high-contrast Thai typography, and unmistakable action buttons over cold, intimidating developer dashboards.

The system explicitly rejects AI-slop tropes: no purple-to-cyan neon gradients, no gradient-clipped headings, no tiny `<12px` metadata badges, no pulsing static dots, and no nested card-in-card containers.

**Key Characteristics:**
- Dual-theme architecture: Warm Cream Paper (`cream`) default + Obsidian Studio (`dark`) toggle.
- Tactile `1.5px solid` structural borders (`#1C1917` on cream, `#2E2E36` on dark) with `20px` card radii.
- Strict WCAG AA contrast floor (`>= 4.5:1`) and Thai-friendly typography floor (`>= 12px` labels, `>= 14px` body copy).

## Colors

The palette balances warm editorial paper neutrals with a decisive crimson-vermilion action accent and high-contrast semantic status tones.

### Primary
- **Crimson Vermilion** (`#A82D24` in cream / `#DC2626` in dark): Primary CTA buttons, active navigation pills, step numbers, and key price highlights.

### Neutral
- **Cream Paper Canvas** (`#EDE6D6`): Default page background, reducing eye strain while reading Thai copy.
- **Pure Card White / Deep Cream Well** (`#FFFFFF` / `#F5EFE3`): Primary card surface and recessed well surface in cream mode.
- **Obsidian Studio Canvas & Card** (`#0F0F12` / `#18181E`): Dark mode canvas and card surface for video playback.
- **Charcoal Primary Ink** (`#1C1917` in cream / `#F4F4F5` in dark): Primary headings, body text, and tactile borders (>13:1 contrast).
- **Warm Stone Secondary & Muted Ink** (`#44403C` / `#57534E` in cream, `#A1A1AA` in dark): Supporting descriptions and metadata (>5.5:1 contrast across all surfaces).

### Named Rules
**The High-Contrast Badge Rule.** Semantic pills on light/cream backgrounds must use deep text tokens (`text-amber-800`, `text-emerald-800`) rather than mid-tone `600` shades, and solid green buttons must use `bg-emerald-700` with white text to guarantee `>= 5.5:1` WCAG AA contrast.

## Typography

**Display & Body Font:** `Prompt` / `Kanit` (with system sans-serif fallback)
**Label/Mono Font:** `JetBrains Mono` (for license keys, version tags, and bank account numbers)

**Character:** Friendly, geometric, and uncramped Thai letterforms with generous line height so tone marks never clip on mobile screens.

### Hierarchy
- **Display** (`900`, `clamp(1.875rem, 4vw, 3rem)`, `1.15`): Hero titles on Landing, Store, and Course pages.
- **Headline** (`800`, `1.25rem–1.75rem`, `1.25`): Section headers and featured banner titles.
- **Title** (`700`, `1rem–1.125rem`, `1.35`): Tool card titles, module headers, and step titles.
- **Body** (`400–500`, `0.875rem–1rem` / `14px–16px`, `1.6`): Tool descriptions, lesson summaries, and FAQ answers (60–75ch max measure).
- **Label** (`700`, `0.75rem` / `12px`, `0.02em`): Category chips, version tags, and status badges.

### Named Rules
**The 12px/14px Thai Legibility Floor Rule.** No UI badge, tag, or caption may render below `12px` (`text-xs`), and no multi-word description or paragraph over 60 characters may render below `14px` (`text-sm`).

## Layout

Pages use a centered container (`max-w-6xl` for catalog/dashboard, `max-w-7xl` for Course Studio) with `16px` (`px-4`) mobile padding and `24px` (`sm:px-6`) desktop padding. Tool catalogs use a responsive 3-column CSS Grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`). Multi-item feature blocks inside a `.puppap-card` use `divide-y` / `divide-x` borders (`divide-[var(--border-light)]`) rather than nesting bordered sub-cards.

## Elevation & Depth

PUP PAP AI uses a **tactile border + subtle ambient shadow hybrid**. Primary hierarchy comes from crisp `1.5px` borders and surface tone shifts (`--bg-primary` → `--bg-card` → `--bg-deep`), reinforced by soft structural shadows.

### Shadow Vocabulary
- **Card Rest** (`box-shadow: 0 4px 16px rgba(28, 25, 23, 0.06)`): Standard resting elevation for `.puppap-card`.
- **Card Hover** (`box-shadow: 0 8px 24px rgba(28, 25, 23, 0.12)`): Combined with `translateY(-4px)` on interactive tool cards.

## Shapes

- **Cards (`.puppap-card`)**: `20px` (`--radius`) with `1.5px solid var(--border)`.
- **Buttons (`.puppap-btn-primary`, `.puppap-btn-secondary`)**: `14px` (`--radius-sm`) or full pill (`9999px`) for primary hero CTAs.
- **Media Containers**: `16:10` aspect ratio for tool posters; `16:9` (`aspect-video`) for Course Studio video playback.

## Components

### Buttons
- **Shape:** `14px` rounded rectangle (`--radius-sm`) or `9999px` pill, `1.5px solid var(--border)`.
- **Primary (`.puppap-btn-primary`):** `background: var(--accent)`, `color: #FFFFFF`, `font-weight: 700`.
- **Hover / Focus:** Shifts to `var(--accent-hover)` with `translateY(-1px)` and `2px solid var(--accent)` focus-visible outline.
- **Secondary (`.puppap-btn-secondary`):** `background: var(--bg-secondary-btn)`, `color: var(--text-primary)`, `1.5px solid var(--border)`.

### Chips
- **Style:** `border-radius: 9999px`, `12px` (`text-xs`) font size, `padding: 2px 10px`, `1px` or `1.5px` border.
- **State:** Active platform tabs invert to `var(--tab-active-bg)` (`#1C1917` in cream, `#DC2626` in dark) with white text.

### Cards / Containers
- **Corner Style:** `20px` radius.
- **Background:** `var(--bg-card)` (`#FFFFFF` in cream, `#18181E` in dark).
- **Border:** `1.5px solid var(--border)`.
- **Internal Padding:** `20px` (`p-5`) to `32px` (`sm:p-8`).

### Protected Course Studio Player
- **Structure:** 16:9 `youtube-nocookie.com` iframe wrapped in a custom fullscreen container (`playerContainerRef`) with invisible click-shield overlays covering YouTube's top title/share bar and bottom-right external link, a static student email watermark, and a Smart Fullscreen button.

## Do's and Don'ts

### Do:
- **Do** use `text-xs` (`12px`) as the minimum size for all badges, tags, and metadata labels, and `text-sm` (`14px`) for all card and lesson descriptions.
- **Do** flatten multi-column steps or value propositions inside `.puppap-card` using `divide-y` / `divide-x divide-[var(--border-light)]` instead of nested bordered cards.
- **Do** use typographic kickers (`<p className="text-xs font-extrabold uppercase tracking-wider text-[var(--accent)]">`) above `<h1>` instead of pill-shaped eyebrow chips.

### Don't:
- **Don't** nest a bordered/rounded card container inside another `.puppap-card`.
- **Don't** use AI-slop purple/violet gradients (`from-purple-600`, `bg-clip-text` gradient headings).
- **Don't** use `animate-pulse` on static status dots or `animate-bounce` on loading indicators.
