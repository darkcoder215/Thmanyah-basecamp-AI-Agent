# Patterns — common components

Reusable patterns for decks, reports, and docs. Paste-ready HTML snippets using tokens from `tokens.css`.

## Card

```html
<div class="card">
  <div class="eyebrow" style="margin-bottom:16px;">الفرص</div>
  <div style="font-family: var(--font-display); font-size: 80px; font-weight:700; color: var(--accent); line-height:1;">45%</div>
  <div style="font-size: 16px; color: var(--fg-muted); margin-top: 12px; line-height:1.5;">
    من وقت الموظّف المعرفي يُصرف على مهام قابلة للأتمتة.
  </div>
</div>
```

## Pill / tag

```html
<span class="pill">
  <span class="diamond-dot" style="width:6px;height:6px;background:var(--accent);transform:rotate(45deg);"></span>
  المرحلة الأولى
</span>
```

Accent variant: add class `pill--accent`.

## Big number (stat-forward)

```html
<div>
  <div style="font-family: var(--font-display); font-weight:700; font-size: 180px; line-height: 0.9; color: var(--fg);">
    3.2<span style="font-size:0.5em;">×</span>
  </div>
  <div style="font-size: 20px; color: var(--fg-muted); margin-top: 12px;">
    متوسّط العائد على الاستثمار خلال 18 شهراً.
  </div>
</div>
```

## Checklist item

```html
<div style="display:flex; align-items:flex-start; gap: 16px;">
  <span style="width:22px; height:22px; border-radius:6px; border:1.5px solid var(--fg-subtle); flex-shrink:0; background: var(--surface-sunk);"></span>
  <div>
    <div style="font-size:18px; font-weight:600; margin-bottom:4px;">قائمة بأعلى 5 مهام</div>
    <div style="font-size:14px; color: var(--fg-muted);">تقدير تقريبي للدقائق الأسبوعية.</div>
  </div>
</div>
```

## Quote / pullquote

```html
<figure style="margin: 0; padding: 48px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
  <div style="font-family: var(--font-display); font-size: 48px; font-weight: 500; line-height: 1.3; color: var(--fg);">
    «الأثر لا يُقاس بالساعات المُوفَّرة — بل بما نصنعه بها.»
  </div>
  <figcaption style="margin-top: 24px; font-size: 16px; color: var(--fg-muted);">
    — اسم المتحدّث · الصفة
  </figcaption>
</figure>
```

## Data table (scoring / comparison)

```html
<table class="data">
  <thead>
    <tr>
      <th>المعيار</th>
      <th style="text-align:left;">النقاط</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="color: var(--fg-muted);">التكرار الأسبوعي</td>
      <td style="text-align:left;"><span class="score" style="font-family:var(--font-display);font-size:24px;font-weight:700;">18</span><span style="color:var(--fg-subtle);font-size:14px;"> / 20</span></td>
    </tr>
  </tbody>
</table>
```

## Process arrow (phase sequence)

```html
<div style="display:flex; gap: 8px; flex:1;">
  <div style="flex:1; padding: 20px 24px; background: var(--surface); border: 1px solid var(--border); clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%);">
    <div style="font-size: 13px; color: var(--accent); letter-spacing: 0.12em; text-transform: uppercase;">المرحلة 1</div>
    <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">الاكتشاف</div>
  </div>
  <!-- repeat for each phase -->
</div>
```

In RTL, the arrow points **right-to-left** so the clip-path's point on the right side works as expected — no need to mirror.

## Gauge / progress bar

```html
<div style="width: 100%; height: 8px; border-radius: 999px; background: var(--surface-sunk); overflow: hidden; position: relative;">
  <div style="width: 72%; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hover)); border-radius: 999px;"></div>
</div>
```

## Footer strip (slide)

```html
<div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between; padding-top:24px; border-top:1px solid var(--border); font-size: 14px; color: var(--fg-subtle);">
  <div style="display:inline-flex; align-items:center; gap: 10px; color: var(--fg-muted); font-weight:500;">
    <span style="width:8px;height:8px;background:var(--accent);transform:rotate(45deg);"></span>
    ثمانية · اسم المبادرة
  </div>
  <div>01 / 12</div>
</div>
```

## Letterhead (report / document)

```html
<header style="display:flex; align-items:center; justify-content:space-between; padding-bottom: 24px; border-bottom: 1px solid var(--border); margin-bottom: 48px;">
  <div style="display:flex; align-items:center; gap: 12px;">
    <span style="width:28px;height:28px;background:var(--accent);transform:rotate(45deg); position:relative;">
      <span style="position:absolute;inset:5px;background:var(--bg);"></span>
    </span>
    <span style="font-family: var(--font-display); font-size: 22px; font-weight: 700;">ثمانية</span>
  </div>
  <div style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-muted);">تقرير داخلي · Q2 2026</div>
</header>
```

## Dotted grid background

```html
<div class="grid-dots" style="position:absolute; inset:0; opacity:0.6; pointer-events:none;"></div>
```

Relies on the `.grid-dots` utility in `tokens.css`.

## Accent glow (ambient lighting on covers)

```html
<div style="position:absolute; inset-inline-end:-300px; inset-block-end:-300px; width:900px; height:900px; border-radius:50%; background: radial-gradient(circle, color-mix(in oklab, var(--accent) 40%, transparent), transparent 60%); filter: blur(40px); pointer-events:none;"></div>
```

Use **one** accent glow max per slide. More than one reads as juvenile.

## Diamond pattern (cover decoration)

```html
<div style="position:absolute; inset:0; opacity:0.06; pointer-events:none;">
  <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none">
    <defs>
      <pattern id="dg" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <rect x="36" y="36" width="8" height="8" fill="#F8F3EA" transform="rotate(45 40 40)"/>
      </pattern>
    </defs>
    <rect width="1920" height="1080" fill="url(#dg)"/>
  </svg>
</div>
```
