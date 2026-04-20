# Tokens reference

All raw values from TDS (Thmanyah Design System). Use these for token-level decisions; use `tokens.css` when writing code.

## Palette

### Brand green (signature)
Used for the **Authentic** palette accent. 500 is the canonical hue; 300 is used on dark backgrounds for AA contrast.

| Step | Hex | Usage |
|------|-----|-------|
| 100 | `#E8EFD0` | Subtle backgrounds (light mode tints) |
| 200 | `#C7D38A` | Accent hover (dark mode) |
| 300 | `#A1B650` | **Accent on dark** |
| 400 | `#7F9632` | — |
| 500 | `#5B7A1E` | **Accent on light · signature** |
| 600 | `#4A6418` | Accent hover (light mode) |
| 700 | `#384C12` | Accent deep (light) |
| 800 | `#27340C` | — |
| 900 | `#151C07` | — |

### Black scale (warm-cool neutrals)

| Step | Hex | Usage |
|------|-----|-------|
| 100 | `#1C1B1A` | **bg (dark)** |
| 200 | `#242322` | **surface (dark)** |
| 300 | `#2E2D2C` | **surface-elev (dark)** |
| 400 | `#3A3937` | Dividers (strong) |
| 500 | `#4A4946` | — |
| 600 | `#5D5C58` | — |
| 700 | `#7A7874` | — |
| 800 | `#A19E99` | — |
| 900 | `#C8C5BF` | — |

### White / cream scale (warm off-white)

| Step | Hex | Usage |
|------|-----|-------|
| 100 | `#FFFFFF` | surface-elev (light) only |
| 200 | `#FCFAF5` | surface (light) |
| 300 | `#F8F3EA` | **bg (light) · canonical cream · fg (dark)** |
| 400 | `#F1EBDC` | — |
| 500 | `#E7DFCB` | surface-sunk (light) |
| 600 | `#D8CDB2` | — |
| 700 | `#C3B594` | — |
| 800 | `#A69878` | — |
| 900 | `#867A5C` | — |

### Semantic scales

```
red    — 100:#FBDDD5 300:#F28874 500:#EF4632 700:#BF2E1E 900:#7A1C12
green  — 100:#C8F2DD 300:#6AD8A3 500:#00BC6D 700:#00894F 900:#004D2C
gold   — 100:#F7E5B8 300:#E8C36B 500:#C89A24 700:#96710E 900:#5A4406
yellow — 100:#FFF1B3 300:#FFD849 500:#FFBA00 700:#B88400 900:#6B4D00
blue   — 100:#CDEEF5 300:#7BCBDC 500:#2F9DB5 700:#176E82 900:#0A3E4A
```

## Three palette variants

| Variant | Dark accent | Light accent | Tone | Best for |
|---------|-------------|--------------|------|----------|
| **Authentic** | `#A1B650` | `#5B7A1E` | Natural, grounded | Default. Internal docs, decks, product. |
| **Ember** | `#EF4632` | `#BF2E1E` | Editorial, urgent | Campaign, op-eds, launch decks. |
| **Gold** | `#E8C36B` | `#C89A24` | Premium, quiet | Annual reports, long-reads, investor decks. |

All three share the same neutral scale — only the accent block changes.

## Radius

4px base. TDS uses 11 steps: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, full (9999).

Named sizes (soft / default):
- `--r-xs: 4px` — tags, micro chips
- `--r-sm: 8px` — inputs, small buttons
- `--r-md: 12px` — standard buttons, small cards
- `--r-lg: 16px` — cards, panels
- `--r-xl: 24px` — hero cards, cover surfaces
- `--r-full: 9999px` — pills, avatars

## Spacing

4px base, 20-step scale:
```
s0:0  s1:2  s2:4  s3:6  s4:8  s5:12 s6:16 s7:20 s8:24  s9:32
s10:40 s11:48 s12:56 s13:64 s14:72 s15:80 s16:96 s17:112 s18:128 s19:160 s20:192
```

Common combinations:
- **Slide padding**: 88px top/bottom, 96px left/right
- **Report page padding**: 64px (letterhead) / 96px (body)
- **Card interior**: 32px (`--s-9`)
- **Card interior (soft)**: 24px (`--s-8`)
- **Vertical rhythm between sections**: 48–72px
- **Gap between cards in a grid**: 24–32px

## Density

| Density | Unit | Control height | Row height | Gutter |
|---------|------|----------------|------------|--------|
| Compact | 3px | 32 | 40 | 16 |
| **Comfortable** (default) | 4px | 40 | 56 | 24 |
| Spacious | 5px | 48 | 72 | 32 |

Slides and editorial content use **Spacious**. Product UI and tables use **Comfortable**. Dashboards with dense data use **Compact**.

## Shadows

### Dark
```
xs — 0 1px 2px rgba(0,0,0,0.4)
sm — 0 2px 6px rgba(0,0,0,0.35)
md — 0 6px 16px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.25)
lg — 0 16px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3)
xl — 0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)
```

### Light
```
xs — 0 1px 2px rgba(10,10,10,0.06)
sm — 0 2px 6px rgba(10,10,10,0.08)
md — 0 6px 16px rgba(10,10,10,0.10), 0 2px 4px rgba(10,10,10,0.05)
lg — 0 16px 40px rgba(10,10,10,0.14), 0 4px 12px rgba(10,10,10,0.06)
xl — 0 32px 80px rgba(10,10,10,0.18), 0 8px 24px rgba(10,10,10,0.08)
```

Shadows are **subtle**. Thmanyah is editorial, not glassmorphic. Rarely go beyond `md` in decks.
