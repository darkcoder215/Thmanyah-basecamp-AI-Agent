# Typography

Thmanyah's type system has **three families** working together. Getting this right is the single strongest brand signal.

## The three families

| Family | Role | When to use |
|--------|------|-------------|
| **Thmanyah Serif Display** | Editorial headlines | Display type 32px+ — slide titles, hero headlines, pull quotes |
| **Thmanyah Serif Text** | Arabic running body | Arabic body copy in long-form (reports, documents, articles) |
| **Thmanyah Sans** | UI + Latin body | Buttons, inputs, captions, Latin body copy, small UI text |

### Weights available
All three families ship in: **Light (300), Regular (400), Medium (500), Bold (700), Black (900)**.

## Pairing rules

- **Headline (Arabic or Latin)**: Serif Display, Bold 700, letter-spacing `-0.015em`, line-height `1.28` (Arabic needs more leading than Latin).
- **Arabic body (long-form)**: Serif Text, Regular 400, line-height `1.7`.
- **Latin body / UI**: Sans, Regular 400 for body / Medium 500 for labels / Bold 700 for emphasis.
- **Eyebrow labels**: Sans, Semibold 600, uppercase, letter-spacing `0.14em`, color = accent.
- **Numerals (anywhere)**: `font-variant-numeric: lining-nums proportional-nums` — force Latin lining figures even inside Arabic. Arabic-Indic digits (٠١٢٣) only if the user explicitly asks.

## Type scale

For web/product UI:

| Token | Size | Line | Weight | Family | Letter |
|-------|------|------|--------|--------|--------|
| `display-1` | 120 | 1.02 | 700 | Display | -0.02em |
| `display-2` | 88 | 1.04 | 700 | Display | -0.02em |
| `display-3` | 64 | 1.05 | 700 | Display | -0.02em |
| `h1` | 48 | 1.1 | 700 | Sans | -0.015em |
| `h2` | 36 | 1.15 | 700 | Sans | -0.01em |
| `h3` | 28 | 1.2 | 600 | Sans | -0.005em |
| `h4` | 22 | 1.25 | 600 | Sans | 0 |
| `h5` | 18 | 1.3 | 600 | Sans | 0 |
| `bodyLg` | 18 | 1.55 | 400 | Sans/Text | — |
| `body` | 16 | 1.55 | 400 | Sans/Text | — |
| `bodySm` | 14 | 1.5 | 400 | Sans | — |
| `label` | 13 | 1.35 | 500 | Sans | — |
| `caption` | 12 | 1.4 | 400 | Sans | — |
| `overline` | 11 | 1.4 | 600 | Sans | 0.1em, uppercase |

### Slide deck scale (1920×1080)

Bump everything up. Minimum readable size is **24px**.

| Purpose | Size |
|---------|------|
| Cover headline | 140–180px |
| Slide title (secondary) | 80–120px |
| Section headline | 64–88px |
| Body copy | 22–28px |
| Card labels | 18–22px |
| Eyebrow / tag | 16–18px |
| Footer / page number | 14–18px |

### Report / document scale (A4 print)

| Purpose | Size (pt) |
|---------|-----------|
| Cover title | 48–60 |
| H1 | 28–36 |
| H2 | 20–24 |
| H3 | 16–18 |
| Body (Arabic serif text) | 12–13 |
| Body (Latin sans) | 10–11 |
| Caption | 9 |

## Arabic-specific rules

1. **Serif Text for long Arabic body** — not Amiri, not Plex Arabic. Serif Text is the tuned reading face.
2. **Line-height 1.7 for Arabic body** — Arabic characters have vertical marks that need breathing room. 1.55 is the minimum.
3. **Line-height 1.28+ on Arabic display** — tight display leading (0.9–1.1) that works for Latin serifs crashes Arabic letterforms into each other. If you need tight leading, insert explicit `<br>` breaks.
4. **No all-caps on Arabic** — Arabic doesn't have case. Use weight or color for emphasis instead.
5. **Letter-spacing is usually 0 to slightly-negative** on Arabic. Never positive unless the typographer asks.
6. **Mixed Arabic + Latin in one headline** — wrap Latin in `<span dir="ltr" style="font-family: var(--font-sans);">` so the sans handles Latin and the serif handles Arabic.

## Hierarchical patterns

### Slide cover
```
eyebrow    (18px sans, uppercase, accent)    ← المرحلة الأولى · 2026
headline   (180px display, bold)             ← ثمانية أذكى.
subtitle   (28px sans light, muted)          ← كيف نقيس الأثر
```

### Report page
```
overline   (11px sans, uppercase)            ← الفصل الثاني
title      (36pt display, bold)              ← كيف نقرأ الأرقام
lead       (16pt serif text, italic?)        ← paragraph intro
body       (13pt serif text, 1.7)            ← long-form Arabic
pullquote  (24pt display, accent color)      ← mid-article quote
```

### Card
```
label      (13px sans semibold, uppercase)   ← الفرص
number     (80px display, accent)            ← 45%
description (16px sans muted)                ← of opportunity cost
```

## Fallbacks

If Thmanyah fonts fail to load, the fallback chain is:
```css
--font-sans:    'Thmanyah Sans', 'IBM Plex Sans Arabic', system-ui, sans-serif;
--font-display: 'Thmanyah Serif Display', 'Amiri', serif;
--font-text:    'Thmanyah Serif Text', 'Thmanyah Serif Display', 'Amiri', serif;
```

Always test with fonts disabled to make sure the design doesn't collapse.

## Common mistakes

- ❌ Using Serif Display at body sizes (< 32px) — loses character
- ❌ Using Sans for long Arabic body — reads as utilitarian
- ❌ Using `line-height: 1` on Arabic display — characters collide
- ❌ Letter-spacing above 0 on Arabic — fractures words
- ❌ Using Amiri or generic Naskh as display — Thmanyah has its own voice
- ❌ Italic emphasis — Thmanyah doesn't italicize. Use weight or accent color.
