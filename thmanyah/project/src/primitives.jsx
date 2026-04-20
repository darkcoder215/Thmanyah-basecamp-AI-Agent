/* global React */

// ─── LOGO ────────────────────────────────────────────────────────────
// Thmanyah Arabic wordmark, rebuilt from real SVG paths.
function ThmanyahLogo({ size=28, color='currentColor', style }) {
  return (
    <svg width={size * (85.333/32)} height={size} viewBox="0 0 85.333 32" style={style}>
      <g fill={color}>
        <path d="M 82.526 2.445 L 80.079 0 L 77.667 2.445 L 80.079 4.926 L 82.526 2.445 Z"/>
        <path d="M 80.366 9.086 L 77.415 15.216 L 81.432 18.701 C 79.7 19.317 78.137 19.517 76.947 19.485 C 74.932 19.412 73.457 17.916 71.225 14.486 C 69.425 11.713 67.878 10.436 66.114 10.436 C 64.134 10.436 62.227 12.37 59.888 15.763 C 58.16 18.281 56.793 19.449 55.245 19.449 C 53.841 19.449 52.69 18.536 52.69 15.107 L 52.69 0 L 52.33 0 L 48.875 4.233 L 49.451 16.821 C 49.739 22.987 51.575 25.468 54.85 25.468 C 56.989 25.468 58.533 24.176 59.533 22.687 L 67.05 27.219 L 70.541 21.126 L 70.721 21.126 C 72.053 24.41 73.924 25.505 76.048 25.505 C 77.632 25.505 79.323 25.213 80.979 24.775 C 82.419 20.068 82.886 17.696 82.886 15.434 C 82.886 13.354 81.879 10.91 80.727 9.085 L 80.368 9.085 L 80.366 9.086 Z M 60.706 16.673 C 61.442 15.839 62.232 15.508 63.055 15.508 C 65.161 15.508 67.433 18.194 69.298 21.603 L 60.706 16.673 Z"/>
        <path d="M 32.607 28.931 L 30.16 26.417 L 27.389 29.227 L 30.16 32 L 32.607 29.519 L 35.055 32 L 37.826 29.227 L 35.055 26.417 L 32.607 28.931 Z"/>
        <path d="M 5.218 3.503 L 7.666 5.984 L 10.437 3.211 L 7.666 0.402 L 5.217 2.917 L 2.735 0.402 L 0 3.211 L 2.735 6.021 L 5.218 3.503 Z"/>
        <path d="M 46.212 4.306 L 43.44 1.496 L 40.705 4.306 L 43.44 7.115 L 46.212 4.306 Z"/>
        <path d="M 35.198 6.276 L 36.89 4.16 L 36.782 3.831 L 17.383 10.472 L 15.728 12.625 L 15.8 12.953 L 35.198 6.276 Z"/>
        <path d="M 43.8 8.793 L 40.849 14.924 L 44.845 18.391 C 42.762 19.059 40.407 19.448 38.258 19.448 C 34.911 19.448 34.802 18.098 34.802 14.595 L 34.802 13.026 L 33.723 13.026 L 32.446 17.744 C 27.549 19.004 22.637 19.485 18.895 19.485 C 13.388 19.485 11.912 18.536 11.912 14.194 L 11.912 4.889 L 11.553 4.889 L 8.206 8.282 L 8.236 9.629 L 6.946 10.326 C 2.627 12.661 0.9 14.376 0.9 17.915 C 0.9 21.127 2.915 22.659 5.399 22.659 C 6.335 22.659 7.199 22.513 7.954 22.184 L 8.805 19.647 C 9.9 23.839 13.11 25.505 18.32 25.505 C 21.955 25.505 26.669 24.994 31.025 23.899 L 32.068 20.688 L 32.32 20.688 C 32.698 23.913 34.14 25.406 37.575 25.468 C 40.095 25.505 42.326 25.139 44.414 24.482 C 45.853 19.958 46.321 17.696 46.321 15.506 C 46.321 13.062 45.314 10.653 44.162 8.793 L 43.803 8.793 L 43.8 8.793 Z M 5.399 16.638 C 3.887 16.638 3.023 16.383 3.023 15.799 C 3.023 15.252 3.563 14.924 5.075 14.303 L 8.31 12.953 L 8.386 16.347 C 8.386 16.373 8.388 16.398 8.388 16.423 C 7.51 16.564 6.424 16.638 5.399 16.638 Z"/>
        <path d="M 80.095 5.996 L 77.631 3.466 L 74.86 6.312 L 77.631 9.086 L 80.095 6.62 L 82.526 9.086 L 85.333 6.312 L 82.526 3.466 L 80.095 5.996 Z"/>
      </g>
    </svg>
  );
}

// The "Thmanyah diamond" — based on the logo glyph. A brand motif.
function DiamondGlyph({ size=64, color='currentColor', style }) {
  return (
    <svg width={size * (107.955/125)} height={size} viewBox="0 0 107.955 125" style={style} fill={color}>
      <path d="M 27.939 0 C 43.615 19.625 49.947 39.279 52.701 59.581 L 55.254 59.581 C 58.008 39.279 64.34 19.625 80.015 0 L 81.56 0 L 107.955 52.632 C 77.209 70.026 64.774 93.958 55.991 125 L 51.964 125 C 43.181 93.958 30.745 70.026 0 52.632 L 26.395 0 L 27.939 0 Z"/>
    </svg>
  );
}

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────
function typeStyle(t, variant, tokens) {
  const v = tokens.type[variant];
  if (!v) return {};
  const fam = v.family === 'display' ? t.display
            : v.family === 'mono' ? "'JetBrains Mono', monospace"
            : t.sans;
  return {
    fontFamily: fam,
    fontSize: v.size,
    lineHeight: v.line,
    fontWeight: v.weight,
    letterSpacing: v.letter || undefined,
    textTransform: v.upper ? 'uppercase' : undefined,
    margin: 0,
  };
}

function Text({ v='body', as='span', children, color, style, ...rest }) {
  const tk = useTokens();
  const C = as;
  return <C style={{ ...typeStyle(tk.t, v, tk), color: color || 'inherit', ...style }} {...rest}>{children}</C>;
}

// ─── ICONS ───────────────────────────────────────────────────────────
// Minimal inline icon set — stroke-based, 1.75px at 24px box.
const IconBase = ({ size=20, children, stroke='currentColor', strokeWidth=1.75, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{display:'inline-block', verticalAlign:'middle', ...style}} {...rest}>{children}</svg>
);
const Icon = {
  Play:    (p) => <IconBase {...p}><polygon points="7 4 20 12 7 20 7 4" fill="currentColor" stroke="none"/></IconBase>,
  Pause:   (p) => <IconBase {...p}><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></IconBase>,
  Search:  (p) => <IconBase {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></IconBase>,
  Menu:    (p) => <IconBase {...p}><path d="M4 7h16M4 12h16M4 17h16"/></IconBase>,
  Close:   (p) => <IconBase {...p}><path d="M6 6l12 12M18 6 6 18"/></IconBase>,
  ArrowL:  (p) => <IconBase {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></IconBase>,
  ArrowR:  (p) => <IconBase {...p}><path d="M5 12h14M12 5l7 7-7 7"/></IconBase>,
  ChevL:   (p) => <IconBase {...p}><path d="M15 18l-6-6 6-6"/></IconBase>,
  ChevR:   (p) => <IconBase {...p}><path d="M9 18l6-6-6-6"/></IconBase>,
  ChevD:   (p) => <IconBase {...p}><path d="M6 9l6 6 6-6"/></IconBase>,
  Home:    (p) => <IconBase {...p}><path d="M3 11 12 3l9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></IconBase>,
  Library: (p) => <IconBase {...p}><path d="M4 5v14M9 5v14M14 5h6v14h-6z"/></IconBase>,
  Heart:   (p) => <IconBase {...p}><path d="M20.8 5.7a5.5 5.5 0 0 0-8.8-1.1 5.5 5.5 0 0 0-8.8 1.1 5.5 5.5 0 0 0 1.1 6.3L12 20l7.7-8a5.5 5.5 0 0 0 1.1-6.3z"/></IconBase>,
  HeartFill:(p)=> <IconBase {...p} stroke="none"><path fill="currentColor" d="M20.8 5.7a5.5 5.5 0 0 0-8.8-1.1 5.5 5.5 0 0 0-8.8 1.1 5.5 5.5 0 0 0 1.1 6.3L12 20l7.7-8a5.5 5.5 0 0 0 1.1-6.3z"/></IconBase>,
  Mic:     (p) => <IconBase {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></IconBase>,
  Share:   (p) => <IconBase {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></IconBase>,
  Download:(p) => <IconBase {...p}><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></IconBase>,
  Plus:    (p) => <IconBase {...p}><path d="M12 5v14M5 12h14"/></IconBase>,
  Check:   (p) => <IconBase {...p}><path d="m5 12 5 5L20 7"/></IconBase>,
  Bell:    (p) => <IconBase {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></IconBase>,
  Settings:(p) => <IconBase {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></IconBase>,
  More:    (p) => <IconBase {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></IconBase>,
  Volume:  (p) => <IconBase {...p}><polygon points="4 10 4 14 8 14 13 18 13 6 8 10 4 10" fill="currentColor" stroke="none"/><path d="M16 8a5 5 0 0 1 0 8"/></IconBase>,
  Skip15:  (p) => <IconBase {...p}><path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5"/><text x="12" y="15" fontSize="6" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">15</text></IconBase>,
  Fullscr: (p) => <IconBase {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></IconBase>,
  Cast:    (p) => <IconBase {...p}><path d="M3 15v3a2 2 0 0 0 2 2h3M3 11V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M3 18a2 2 0 0 1 2 2"/></IconBase>,
  Live:    (p) => <IconBase {...p} stroke="none"><circle cx="12" cy="12" r="5" fill="currentColor"/></IconBase>,
  Clock:   (p) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></IconBase>,
  Calendar:(p) => <IconBase {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></IconBase>,
  Trend:   (p) => <IconBase {...p}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></IconBase>,
  Globe:   (p) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></IconBase>,
  User:    (p) => <IconBase {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></IconBase>,
  Filter:  (p) => <IconBase {...p}><path d="M4 5h16l-6 8v6l-4-2v-4z"/></IconBase>,
  Sparkle: (p) => <IconBase {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></IconBase>,
  Quote:   (p) => <IconBase {...p} stroke="none"><path fill="currentColor" d="M7 7h4v4H9a2 2 0 0 1 2 2v4H5v-4l2-6zM15 7h4v4h-2a2 2 0 0 1 2 2v4h-6v-4l2-6z"/></IconBase>,
};

// Expose
Object.assign(window, {
  ThmanyahLogo, DiamondGlyph, Text, Icon, typeStyle
});
