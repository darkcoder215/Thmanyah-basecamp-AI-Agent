# Imagery

Thmanyah is a film/photo brand. Imagery is central — never decorative.

## Sources

Use in this order of preference:

1. **Real Thmanyah photography** — supplied by the user (shows, documentaries, portraits)
2. **Licensed stock that matches the tone** — editorial, grainy, warm, human-centric
3. **Placeholder rectangles** — colored blocks with a label, clearly marked
4. **Never** — emoji, AI-generated illustrations, vector icon art, glossy stock

## Tonal guidelines

- **Warm, grainy, editorial.** Think documentary film stills, not corporate headshots.
- **Portraits**: natural light, shallow DOF, direct eye contact when possible.
- **Environments**: Arabian Peninsula landscapes, Saudi cities, interior architecture, Islamic patterns.
- **Moments**: candid, cinematic, human activity.
- **Avoid**: staged corporate imagery, generic office shots, "diverse team laughing at laptop" stock.

## Treatment

- **Color grading**: slight warm cast, blacks lifted to warm neutral, never crushed pure black.
- **Grain**: subtle film grain is on-brand.
- **Overlays**: a dark scrim (`linear-gradient(to top, rgba(28,27,26,0.9), transparent 60%)`) on hero images so text reads cleanly at the bottom.
- **Borders**: images sit flush with cards or full-bleed — rarely framed with borders.
- **Radius**: match the page radius — `--r-lg` or `--r-xl` for featured images, `--r-md` for thumbnails.

## Cover / hero image

```html
<div style="position:relative; aspect-ratio: 16/9; overflow:hidden; border-radius: var(--r-xl);">
  <img src="assets/hero.jpg" style="width:100%; height:100%; object-fit:cover;">
  <div style="position:absolute; inset:0; background: linear-gradient(to top, rgba(28,27,26,0.95) 0%, rgba(28,27,26,0.4) 50%, transparent 80%);"></div>
  <div style="position:absolute; bottom: 48px; right: 48px; left: 48px;">
    <!-- headline over image -->
  </div>
</div>
```

## Portrait grid

For author/guest grids, use **square crops** with generous padding around the grid. Names in sans below, one line.

## Placeholder pattern

If you don't have an image, use a warm-toned placeholder — never gray:

```html
<div style="aspect-ratio: 4/3; background: linear-gradient(135deg, #384C12, #7A1C12); display:flex; align-items:center; justify-content:center; color: rgba(248,243,234,0.6); font-family: var(--font-sans); font-size: 14px; border-radius: var(--r-lg);">
  صورة — غلاف الحلقة
</div>
```

And tell the user these are placeholders and what should go there.

## Image sizing in decks

| Role | Size | Notes |
|------|------|-------|
| Cover full-bleed | 1920×1080 | Gradient scrim over bottom third |
| Half-bleed hero | 960×1080 | Right-half of slide, left is text |
| Card thumbnail | 480×320 | `object-fit: cover` |
| Portrait (guest) | 320×320 | Square, circular or rounded-lg |
| Show poster | 360×540 | 2:3 ratio, cover art |

## Diamond mark over imagery

Do **not** place the diamond brand mark directly over imagery unless there's a guaranteed-dark scrim. The mark is cream/accent — it disappears on mid-tone photos.
