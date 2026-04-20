# Layout

## Grid

**12-column grid, 24px gutter, 96px outer margin** for decks and wide surfaces.
**6-column grid, 16px gutter, 48px outer margin** for documents and reports.

Use CSS grid with explicit column counts — don't rely on flex with magic percentages.

```css
.layout-wide {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: 88px 96px;
}
```

## Slide structure (1920×1080)

Every content slide follows this vertical rhythm:

```
┌─────────────────────────────────────────────┐
│  [88px top padding]                         │
│                                             │
│  eyebrow · 16-18px · accent · uppercase     │
│  [32px gap]                                 │
│  headline · 64-120px · display · bold       │
│  [24px gap]                                 │
│  subtitle · 22-28px · sans · muted          │
│  [48-64px gap]                              │
│                                             │
│  ─── MAIN CONTENT ───                       │
│                                             │
│  [24px gap] + [divider] + [24px gap]        │
│  footer row · 14px                          │
│    brand · diamond + name      page · "01/12" │
│  [88px bottom padding]                      │
└─────────────────────────────────────────────┘
           96px side padding (both)
```

### Slide types

1. **Cover** — centered headline + bottom metadata row (leader, date, contact, page)
2. **Section break** — eyebrow + very large headline, full bleed, minimal content
3. **Content (1-column)** — eyebrow, headline, subtitle, body content
4. **Content (2-column)** — left text / right viz, or right text / left image (RTL flips this)
5. **Data / stat-forward** — one big number + supporting cards
6. **List / checklist** — 2-column grid of items
7. **Quote / moment** — large pull quote, attribution, optional portrait
8. **Closing** — echoes cover but with next-steps + contact

## Report / document structure (A4)

```
┌─────────────────────────────────────────┐
│  [64px top padding]                     │
│  [letterhead: diamond + thmanyah logo]  │
│  [divider line]                         │
│  [48px gap]                             │
│                                         │
│  overline · 11pt uppercase              │
│  title · 28-36pt display                │
│  [optional hero image, full-bleed]      │
│  [24px gap]                             │
│                                         │
│  ─── body (1 or 2 columns) ───          │
│  12-13pt serif text, line-height 1.7    │
│                                         │
│  [pullquote every 3-4 pages]            │
│                                         │
│  [footer: page number · section]        │
│  [64px bottom padding]                  │
└─────────────────────────────────────────┘
```

Use `@page { size: A4; margin: 0; }` and `.page { width: 210mm; height: 297mm; }` for print-ready.

## RTL considerations

- `dir="rtl"` flips the **reading direction** (right-to-left) AND **the main axis** of flex/grid.
- Logical properties (`padding-inline-start`, `margin-inline-end`) adapt automatically.
- Physical properties (`padding-left`, `right:`) do NOT flip — use logical props or `[dir="rtl"]` overrides.
- Icons/arrows that imply direction (next/prev) must be mirrored — use `transform: scaleX(-1)` on chevrons.
- Numbers, dates, and Latin strings inside Arabic text stay LTR naturally due to Unicode bidi — don't fight it.

## Footer pattern

Every content slide has a footer strip:

```html
<div class="slide-footer">
  <div class="brand">
    <span class="diamond-dot"></span>
    ثمانية · اسم المبادرة
  </div>
  <div>01 / 12</div>
</div>
```

With styles:
```css
.slide-footer {
  margin-top: auto;
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 14px; color: var(--fg-subtle);
}
.slide-footer .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--fg-muted); font-weight: 500; }
.diamond-dot { width: 8px; height: 8px; background: var(--accent); transform: rotate(45deg); }
```

## Rhythm & hierarchy

- **One idea per slide.** If a slide needs two titles, split it.
- **Whitespace is a feature.** Do not fill empty quadrants with filler.
- **Anchor the eye**: every slide should have one dominant element — a headline, a number, an image. Not three co-equal things.
- **Establish a rhythm**: alternate dense content slides with minimal section-break slides. A 12-slide deck with 3 section breaks feels like a 30-page editorial, not a corporate deck.

## Safe zones

For decks shown on video calls or projectors:
- **64px safe margin** on all edges for critical content
- Page number / footer in the bottom safe strip (48px tall), centered or in corners
- No text within 48px of the top edge

## Section breaks

A section break is a visual pause between groups of slides. Formula:

```
  [ambient dot grid or tinted color block]
  
  [large eyebrow-style section number · 24px]
  [very large section title · 180px display]
  [optional one-line description · 32px sans]
  
  [page number]
```

Section breaks are the **single biggest tool** for making a deck feel editorial rather than deck-y.
