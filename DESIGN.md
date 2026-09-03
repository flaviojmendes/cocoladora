---
name: Cocoladora
description: Humorous and viral bathroom earnings calculator and community restroom reviewer
colors:
  primary: "#815028"
  primary-dark: "#693a20"
  primary-light: "#a95d2f"
  secondary: "#292420"
  secondary-light: "#413831"
  background: "#fcf9ea"
  background-dark: "#f5f0d9"
typography:
  display:
    fontFamily: '"Chicle", cursive, sans-serif'
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: '"Boogaloo", cursive, sans-serif'
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
  body:
    fontFamily: '"Boogaloo", system-ui, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: '"Cousine", monospace'
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  graffiti:
    fontFamily: '"Sedgwick Ave", cursive'
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Cocoladora

## 1. Overview

**Creative North Star: "The Irreverent Throne Room"**

Cocoladora turns an everyday relatable experience into an entertaining, tactile digital toy and utility. The interface is confident, warm, and playful without sacrificing usability or responsiveness. Built around rich roasted-earth tones (`#413831` background and `#815028` saddle accents) paired with warm high-contrast text and cards (`#fcf9ea`), it steers clear of boring corporate grey spreadsheets and generic SaaS templates.

The tool is deployed on Vercel with serverless endpoints, persistent Vercel Postgres storage, and delightful tactile micro-interactions. Zero fake or mock seed data is inserted.

**Key Characteristics:**
- Distinctive expressive typography combining comic-grotesque display headers with legible monospaced paycheck statements.
- Bold, deliberate outlines (3-4px solid borders) giving a punchy, retro comic/stick-note aesthetic.
- True real data: all calculations, history logs, restroom ratings, and toilet door graffiti persist in Vercel Postgres with zero mock data.
- Accessible contrast (exceeding WCAG AA 4.5:1 ratio) with intuitive keyboard navigation and touch-friendly targets.

## 2. Colors

A bold, earthy, warm palette evoking coffee, leather, and bathroom humor with high contrast and clarity.

### Primary
- **Saddle Umber** (`#815028`): Core brand action color, active buttons, primary badges, and focal icons.
- **Roasted Espresso** (`#693a20`): Pressed button state, deep borders, and high-emphasis headers.
- **Warm Terracotta** (`#a95d2f`): Hover highlights, secondary badges, and active tab indicator.

### Neutral
- **Deep Umber Night** (`#413831`): Page body background providing an immersive dark canvas that makes cards pop.
- **Espresso Dark** (`#292420`): High-contrast card text, dark borders, and header backgrounds.
- **Light Parchment** (`#fcf9ea`): Card surfaces, modal containers, and high-contrast light text against dark canvases.
- **Warm Sand** (`#f5f0d9`): Secondary panel backgrounds, input fills, and container insets.

### Named Rules
**The High-Contrast Legibility Rule.** Every light surface (`#fcf9ea` / `#f5f0d9`) must use deep espresso ink (`#292420` / `#693a20`) for text. Never use washed-out grey body text on light backgrounds.

## 3. Typography

**Display Font:** "Chicle", cursive display
**Secondary Font:** "Boogaloo", retro comic sans-serif
**Monospace / Paycheck Font:** "Cousine", typewriter mono
**Graffiti Font:** "Sedgwick Ave", street handwriting cursive

**Character:** Bold, nostalgic, comic-strip humor with crisp monospace tabular numbers for the paycheck.

### Hierarchy
- **Display (Chicle, 700, 2rem–3.5rem):** Main logo and hero title.
- **Headline (Boogaloo, 600, 1.5rem–2rem):** Section titles, calculator headings, modal titles.
- **Body / Buttons (Boogaloo, 400–600, 1rem–1.25rem):** Interactive buttons, form labels, tooltips.
- **Paycheck & Data (Cousine, 400, 0.9rem–1.05rem):** Historical earnings logs, dates, timestamps, currency amounts.
- **Door Graffiti (Sedgwick Ave, 400, 0.95rem–1.15rem):** Community messages on the virtual toilet door.

### Named Rules
**The Tabular Data Rule.** Paycheck earnings, dates, and currency totals must render in monospace ("Cousine") to guarantee columnar alignment and vintage receipt feel.

## 4. Elevation

Cocoladora relies on tactile borders, distinct solid offset shadows, and tonal layering rather than fuzzy diffuse drop shadows.

### Shadow Vocabulary
- **Tactile Card Shadow** (`box-shadow: 0 4px 12px rgba(41, 36, 32, 0.25)`): Card and container elevation against dark backgrounds.
- **Tactile Button Press** (`transform: translateY(1px); box-shadow: 0 2px 4px rgba(41, 36, 32, 0.2)`): Click and active feedback.
- **Door Panel Inset** (`border: 6px solid #292420; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2)`): The framed wooden bathroom stall door.

### Named Rules
**The No-Fuzzy-Glass Rule.** Avoid decorative blur, glassmorphism, or diffuse 30px glow shadows. Shadows must be bounded, tactile, and purposeful.

## 5. Components

### Buttons
- **Shape:** Rounded-lg (10px–12px radius) with solid 2px–3px borders.
- **Primary:** Saddle Umber (`#815028`) fill with Parchment (`#fcf9ea`) text and 12px 24px padding.
- **Hover / Active:** Darkens to `#693a20` on hover, translates down 1px on active press.
- **Transitions:** 150ms ease-out transitions on transform and background.

### Cards & Form Containers
- **Corner Style:** Rounded-2xl (16px radius) with 3px–4px solid `#815028` or `#292420` border.
- **Background:** `#fcf9ea` parchment with `#292420` deep espresso text.
- **Padding:** 16px mobile, 24px–32px on desktop.

### Inputs & Selects
- **Style:** Crisp white/sand fill, solid 2px border, rounded-lg, 12px 16px padding.
- **Focus:** 2px solid `#815028` with subtle outline ring, zero layout shift.

### Restroom Rating Stars / Icons
- **Interactive Stars / Poop Icons:** 1–5 clickable icons with instant hover preview, active gold/amber fill (`#d97706`), inactive muted fill (`#d1d5db`).

### Toilet Door Graffiti Board
- **Surface:** Wood stall door finish with realistic sticker and scratch messages in handwriting fonts.
- **Interactive Writer:** Local modal/drawer allowing users to type their message, pick ink color and handwriting style, and stick it directly onto the door.

## 6. Do's and Don'ts

### Do:
- **Do** store real user data in Vercel Postgres via `/api/*` serverless routes.
- **Do** provide clear feedback, confirmation toasts, and validation for all user actions.
- **Do** support both English and Portuguese seamlessly with standard locale toggles.
- **Do** ensure 44x44px minimum touch targets on mobile for buttons, rating icons, and map markers.
- **Do** support image export/download for the customized "Paid to Poop" certificate.

### Don't:
- **Don't** insert fake, mock or seeded demo data.
- **Don't** leave broken Auth0 or tracking boilerplate in user flows.
- **Don't** use low-contrast muted grey text on parchment backgrounds.
- **Don't** use generic AI SaaS blue/purple gradients, glassmorphic cards, or floating blobs.
- **Don't** let long numbers or translations overflow their containers.
