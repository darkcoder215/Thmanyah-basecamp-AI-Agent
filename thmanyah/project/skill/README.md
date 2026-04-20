# Thmanyah Design System Skill

A portable skill for creating on-brand designs, presentations, reports, and marketing material for **ثمانية / Thmanyah**.

## What's inside

```
skill/
├── SKILL.md                  ← primary instructions — start here
├── README.md                 ← this file
├── reference/
│   ├── tokens.css            ← drop-in stylesheet — paste into any artifact
│   ├── tokens.md             ← raw palette, radius, spacing, shadow values
│   ├── typography.md         ← font families, type scale, Arabic rules
│   ├── imagery.md            ← photo tone, placeholders, treatments
│   ├── layout.md             ← grid, slide structure, report structure
│   ├── patterns.md           ← paste-ready HTML snippets for cards, pills, quotes…
│   └── rtl.md                ← right-to-left gotchas
├── templates/
│   ├── deck.html             ← 1920×1080 slide deck with <deck-stage>
│   ├── deck-stage.js         ← the web component (load before your deck)
│   ├── report.html           ← A4 print-ready editorial report
│   ├── document.html         ← memo / one-pager
│   ├── landing.html          ← marketing / show-page
│   └── social.html           ← IG portrait + square cards
└── assets/
    ├── fonts/                ← Thmanyah Sans / Serif Display / Serif Text (OTF)
    └── logo-thmanyah-ar.svg  ← Arabic wordmark
```

## How to use this skill

### If you're Claude

1. **Read `SKILL.md` first.** It gives you the workflow and the asking-questions checklist.
2. Based on the artifact type, read the relevant `reference/*.md` files.
3. Copy `reference/tokens.css` into your project, then one of the `templates/*.html` scaffolds.
4. Copy `assets/fonts/` into your project so the @font-face URLs resolve.
5. Follow the rules in `SKILL.md` — RTL first, editorial serif display, diamond mark, no emoji, warm neutrals.

### If you're a human

1. Upload this folder to Claude as a skill.
2. When starting a new Thmanyah-branded project, tell Claude "use the Thmanyah skill".
3. Optionally attach real photography — Claude will use placeholders otherwise.

## Palette variants

- **Authentic** (default) — brand green `#5B7A1E` / `#A1B650`. Internal docs, product.
- **Ember** — signal red `#EF4632`. Campaign, launch decks, op-eds.
- **Gold** — warm gold `#C89A24`. Annual reports, premium long-form.

Pick one per artifact. Don't mix.

## Font license

Thmanyah fonts are proprietary to ثمانية. This skill bundles them for use in Thmanyah-branded work only. Do not redistribute outside that context.

## Version

v1.0 · April 2026
