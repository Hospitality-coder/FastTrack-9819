# FastTrack — Design System

Neon-green ninja energy on a black base. Motivating, young, adventurous. Layout cues from the reference template: deep-green gradient hero at the top of screens, bright green pill buttons with dark text, big rounded cards, pixel-font accents on key words and numbers.

## Palette (shared tokens — web `styles.css` + mobile `constants/theme.ts`)

| token | hex | use |
|---|---|---|
| background | `#070A07` | app background |
| card | `#0F1A10` | cards, sheets |
| secondary / deep | `#153D22` | deep-green surfaces, hero gradient end |
| hero gradient | `#1B5E2E → #070A07` | top-of-screen mesh (radial, 40% height) |
| primary | `#39FF14` | neon green — CTAs, rings, active states |
| primaryForeground | `#06120A` | text on neon |
| accent / lime | `#B6FF5C` | secondary highlights, chart line 2 |
| foreground | `#E8FFE0` | main text |
| mutedForeground | `#8A9A8C` | secondary text |
| border | `#1E2E20` | 1px borders |
| destructive | `#FF4D6D` | over-limit, broken fast, delete |
| warning | `#FFD60A` | near-limit |
| water | `#38E1FF` | water ring/chart (cyan so it reads differently from green) |
| glow | `rgba(57,255,20,0.35)` | box-shadow behind rings and primary buttons |

Light mode is not a goal: both mobile schemes use the dark palette (the app is always dark, like the ninja ref).

## Typography

- **Display**: Unbounded (700/900) — headlines, timer digits, big numbers
- **Body**: Manrope (400/500/700) — everything else
- **Accent**: Silkscreen (400) — pixel font for one highlighted word per headline, streak counts, rank labels, section eyebrows (`FUEL`, `STREAK`). Always uppercase, letter-spacing 1px, neon green.

Scale (mobile / web): eyebrow 11/12 · body 15/15 · label 13/13 · h3 18/20 · h2 24/28 · h1 32/40 · timer 56/72.
Line height 1.4 body, 1.1 display.

## Shapes & spacing

- Radius: cards 24, buttons pill (999), chips 12, inputs 14
- Spacing unit 4; screen gutter 20; card padding 20; section gap 28
- Borders 1px `border`; cards may add a faint inner top highlight `rgba(255,255,255,0.04)`
- Rings: 14px stroke, round caps, neon on `#1A2A1C` track, outer glow

## Components

- **PillButton** primary: neon bg, dark text, 52px tall, Unbounded 700 14px, glow. Ghost: transparent, 1px border, foreground text. Danger: destructive outline.
- **Chip**: deep-green bg, lime text, 32px tall — protocol presets, water quick-add.
- **StatCard**: card bg, eyebrow (Silkscreen) + big number (Unbounded) + label.
- **FastRing / WaterRing**: SVG ring + centered digits.
- **MacroBar**: horizontal bar per macro, neon fill, turns destructive when > target.
- **SuggestionCard**: horizontal carousel card, image-less, lime tag chips, "why for you" line.
- **RankBadge**: Silkscreen label + mascot thumbnail; ranks: Novice → Apprentice → Shadow → Blade → Master → Grandmaster.

## Backgrounds

Every screen: black, with a radial neon-green mesh at the top (`radial-gradient(ellipse at 50% -20%, #1B5E2E 0%, transparent 60%)`) plus a subtle 24px grid at 4% opacity on the hero area. Celebration screen adds scattered neon particles.

## Motion

- Screen load: stagger fade-up (opacity 0→1, translateY 16→0, 60ms per child)
- Rings animate fill on mount (600ms ease-out)
- Fast complete: scale pulse on ring + glow bloom + haptic (mobile)
- `useNativeDriver: false` everywhere on mobile (web preview)

## Copy tone

Short, punchy, ninja-flavoured. Examples: "Fast locked in." · "Eating window opens in 3h 12m." · "Hydrate, shinobi." · "Streak: 7 days. Keep to the shadows." Never guilt-tripping.

## Mascot

Original neon-green ninja mascot (generated), used for app icon, splash, empty states and rank badges. Files: `packages/mobile/assets/icon.png`, `splash-icon.png`; `packages/web/public/images/ninja.png`, `favicon`.
