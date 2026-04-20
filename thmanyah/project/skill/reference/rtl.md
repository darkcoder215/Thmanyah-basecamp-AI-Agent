# RTL (right-to-left) handling

Arabic content is RTL. This file covers the gotchas.

## The basics

Set direction on the root:

```html
<html lang="ar" dir="rtl">
```

For mixed-language content, set `dir="rtl"` on the Arabic-dominant container and wrap Latin runs:

```html
<p dir="rtl">
  فريق <span dir="ltr">Thmanyah</span> يُنتج المحتوى منذ 2016.
</p>
```

## Flexbox and Grid flip automatically

`flex-direction: row` in RTL lays children **right-to-left**. `justify-content: flex-start` aligns to the **right**. This is usually what you want.

## Logical properties (preferred)

Use these; they flip automatically with `dir`:

| Physical | Logical |
|----------|---------|
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `margin-left` | `margin-inline-start` |
| `left: 0` | `inset-inline-start: 0` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |

## Icons and arrows

Direction-implying icons must mirror:

```css
[dir="rtl"] .icon-chevron-next { transform: scaleX(-1); }
```

Or flip the icon at the SVG level. Icons that don't imply direction (search, heart, settings) stay as-is.

## Numbers

Latin numerals inside Arabic flow correctly due to Unicode bidi. Don't fight it — use:

```css
body { font-variant-numeric: lining-nums proportional-nums; }
```

For Arabic-Indic digits (٠١٢٣) use `font-feature-settings: "lnum" off;` and the browser + font should handle it. Default to Latin unless the user asks otherwise — Thmanyah's documented standard is Latin numerals in Arabic copy.

## Mixed text direction

Inside a paragraph of Arabic, a URL, email, or English word will flow LTR naturally. If it breaks:

```html
<span dir="ltr" style="unicode-bidi: isolate;">hello@thmanyah.com</span>
```

## Tables

In RTL, the first column is on the **right**. Headers:

```css
table.data th, table.data td { text-align: right; }   /* default in RTL */
[dir="ltr"] table.data th, [dir="ltr"] table.data td { text-align: left; }
```

Numeric columns still align **left** (or use `text-align: end` with manual override) so digits line up by place value.

## Slide footer

The footer row has brand on one side, page number on the other. In RTL:

```html
<div class="slide-footer">
  <div class="brand">ثمانية · العنوان</div>   <!-- this goes to the RIGHT -->
  <div>01 / 12</div>                            <!-- this goes to the LEFT -->
</div>
```

Because `display: flex; justify-content: space-between` respects direction, the first child lands on the reading-start side (right in RTL). This matches reader expectation — brand is where your eye lands first.

## Common mistakes

- ❌ Hardcoding `padding-left: 24px` — won't flip.
- ❌ Mirroring chevrons that are **ornamental** — a decorative leaf doesn't need flipping.
- ❌ Forgetting to set `dir="rtl"` on the root — Arabic text will still render LTR-ish in Latin-first layouts.
- ❌ Using `float: left/right` with Arabic — use flex or logical floats (`float: inline-start`).
- ❌ CSS `transform: translateX(20px)` moves right even in RTL — swap to negative for reading-direction-aware movement, or use logical equivalents.

## Testing

Quickly flip direction with devtools:
```js
document.documentElement.dir = document.documentElement.dir === 'rtl' ? 'ltr' : 'rtl';
```

Check that:
- Nothing runs off the wrong edge
- Icons with direction (arrows, quotes) mirror
- Numbers stay Latin and lined up
- Alignment reads naturally for the language
