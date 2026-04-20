# Thmanyah Design System Skill

Create designs, presentations, and reports for **ثمانية / Thmanyah** — the Saudi media company behind podcasts, documentaries, and knowledge products. This skill gives you the real brand tokens, typography, imagery language, and layout patterns lifted directly from the Thmanyah Design System (TDS).

## When to use this skill

Activate this skill whenever the user asks for:

- **Slide decks** — pitch decks, internal presentations, workshops, QBRs, product reviews
- **Reports & whitepapers** — research reports, editorial long-reads, annual reviews, data-heavy briefings
- **Documents** — memos, PRDs, one-pagers, process guides, checklists
- **Marketing pages** — landing pages, campaign pages, show pages, episode pages
- **Social graphics** — quote cards, episode announcements, moment cards
- **Branded product UI** — app screens, web surfaces, email templates

If the user's language is Arabic, or the artifact is for the Arab market, **always default to RTL + Arabic-first typography**. If they're building something for a Latin/mixed audience, use Latin-first but keep the accent hue and brand structure.

---

## Quick start (90% of use cases)

1. **Create the HTML file** with `lang="ar" dir="rtl"` and paste the CSS tokens from `reference/tokens.css`.
2. **Load the fonts** — copy files from `assets/fonts/` into your project and reference via `@font-face`.
3. **Pick a palette variant** — `authentic` (green, default), `ember` (red), or `gold` (editorial).
4. **Pick a template** — see `templates/` for ready-made deck/report/landing scaffolds.
5. **Use real imagery** — placeholder images from `assets/imagery/` or ask the user for real ones.

---

## Core design principles

These are the non-negotiables. If you break them, the output stops looking like Thmanyah.

### 1. Arabic-first, always

- **RTL layout by default.** Use `dir="rtl"` on `<html>` or the root slide container.
- **Arabic body copy uses `Thmanyah Serif Text`** — not sans, not generic Amiri.
- **Display headlines use `Thmanyah Serif Display`** — the signature editorial serif. This is the single strongest brand signal. Do not replace it with Inter/Fraunces/generic serifs.
- **Latin text uses `Thmanyah Sans`** for UI, and the serif for display if mixing in a headline.
- **Numerals: force Latin lining figures** even inside Arabic. Use `font-variant-numeric: lining-nums proportional-nums;` on body.

### 2. Editorial, not corporate

- Long, confident headlines. Poetic or declarative. Not bulleted value-props.
- Ample negative space. Padding scale starts at 88px top/bottom on slides, 96px left/right.
- One idea per slide, per card, per section. Thmanyah is a media brand — it earns the right to be spacious.
- **No decorative icon clutter.** If you wouldn't put it in a book, don't put it on the slide.

### 3. Dark is the canonical mode

The deck/app default mode is **dark on warm off-black**, with warm cream text. Light mode uses warm cream background. Pure white (#FFF) is rare — use cream `#F8F3EA` instead.

### 4. The diamond is the only logo mark you invent

Thmanyah's identity is the **rotated square / diamond glyph** (solid, with a cut-out inner square). Use it as a bullet, a divider, a brand mark. Never draw new mascot-y icons.

### 5. Real imagery > illustrations

Thmanyah is a film/photo brand. Use photography with contrast — faces, landscapes, portraits, moments. Avoid SVG illustrations, avoid emoji, avoid stock-vector art. If you don't have real imagery, use colored placeholder blocks and note them for the user.

---

## Reading order for this skill

Load these files in this order depending on the task:

| File | When to read |
|------|-------------|
| `reference/tokens.css` | **Always.** Copy into every artifact. |
| `reference/tokens.md` | When the user asks for color/token details, or you're picking palette variants. |
| `reference/typography.md` | Every time — get type scale, pairings, Arabic/Latin rules right. |
| `reference/imagery.md` | When the artifact uses photos or cover images. |
| `reference/layout.md` | For any multi-screen artifact — deck, report, landing. |
| `reference/patterns.md` | When building common components (cards, pills, stats, tables, quotes, footers). |
| `reference/rtl.md` | If you're new to RTL layout — covers the gotchas. |
| `templates/deck.html` | Slide deck scaffold — 1920×1080, `<deck-stage>`. |
| `templates/report.html` | Print-ready report scaffold — A4, multi-column. |
| `templates/document.html` | Memo/one-pager scaffold. |
| `templates/landing.html` | Marketing / show-page scaffold. |
| `templates/social.html` | Quote card / announcement scaffold. |

---

## The three palette variants

All three share the same neutral structure (warm off-black dark mode, cream light mode). They differ only in **accent hue**:

- **Authentic** (default) — brand green `#5B7A1E` light / `#A1B650` dark. The TDS signature.
- **Ember** — signal red `#EF4632`. Editorial/urgent tone. Good for bold decks, campaign material.
- **Gold** — warm gold `#C89A24`. Premium/quiet tone. Good for reports, annual reviews, long-form.

Pick one per artifact. Do not mix accents within a single deck.

---

## File format decision tree

- **HTML slide deck** → use `<deck-stage>` (see `templates/deck.html`). 1920×1080.
- **Report (for print or PDF)** → A4 pages via CSS page breaks. See `templates/report.html`.
- **One-pager / memo** → single-column document with letterhead. See `templates/document.html`.
- **Landing / marketing** → responsive, full-bleed sections. See `templates/landing.html`.
- **Social graphic** → 1080×1350 (IG portrait) or 1080×1080 (square). See `templates/social.html`.

---

## Verification checklist

Before handing anything off, check:

- [ ] `dir="rtl"` on root if Arabic content
- [ ] Thmanyah fonts actually loaded (not falling back to Amiri/system)
- [ ] Display serif used on headlines, sans on UI/body, serif text on Arabic running body
- [ ] Minimum type size: 24px on slides, 12pt (16px) on documents
- [ ] Accent hue is ONE of the three palette variants — not invented
- [ ] Diamond mark used if a brand glyph is needed — not a generic logo
- [ ] Photography is real or clearly marked as placeholder
- [ ] No emoji, no SVG-illustrated icons, no rainbow gradients
- [ ] Latin numerals inside Arabic text (not ٠١٢٣ unless the user asks)
- [ ] Cream `#F8F3EA` instead of pure white where backgrounds are light
- [ ] Generous padding — 88px+ on slide edges, 64px+ on report pages

---

## When the user gives you content in English

Thmanyah is an Arab brand but frequently publishes bilingual material. Default behavior:

- If content is Arabic → RTL + Thmanyah Serif Display/Text
- If content is English → LTR + Thmanyah Sans, but keep the diamond mark, palette, and layout DNA
- If content is mixed → RTL document with the dominant language setting direction; wrap Latin runs in `<span dir="ltr">` or use `unicode-bidi: plaintext`

---

## Things NOT to do

- ❌ Don't use Inter, Roboto, Fraunces, Playfair, or any generic serif/sans — we have Thmanyah.
- ❌ Don't use emoji as iconography — ever.
- ❌ Don't draw custom SVG illustrations of people, devices, abstract shapes.
- ❌ Don't use pure black `#000` or pure white `#FFF` for large surfaces — warm neutrals only.
- ❌ Don't introduce a fourth accent color — stick to authentic/ember/gold.
- ❌ Don't center-align long running body copy — it reads poorly in both Arabic and Latin.
- ❌ Don't compress the editorial serif below 32px — it loses its character. Use sans below that.
- ❌ Don't mix display serifs with multiple weights in the same headline.
- ❌ Don't use rainbow / hero-gradient backgrounds. A single radial accent glow is the ceiling.

---

## Asking the user

Before starting anything significant, ask:

1. **Language**: Arabic, English, or bilingual?
2. **Palette**: Authentic (green), Ember (red), or Gold (editorial)?
3. **Mode**: Dark (default) or light?
4. **Artifact type**: Deck, report, document, landing, social, or product UI?
5. **Imagery**: Do you have real photos? If not, acknowledge placeholders.
6. **Variations**: One locked design or multiple explorations?

If the user is clearly mid-project and has already established these, don't re-ask.
