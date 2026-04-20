/* global React */

// ════════════════════════════════════════════════════════════════════
//  THMANYAH DESIGN SYSTEM · tokens
//  Raw scales lifted from TDS (Figma) then mapped onto the semantic
//  surface keys the rest of the app consumes.
// ════════════════════════════════════════════════════════════════════

// ─── RAW SCALES (from TDS) ──────────────────────────────────────────
// Brand green — the core hue. 500 is "signature".
const BRAND = {
  100: '#E8EFD0',
  200: '#C7D38A',
  300: '#A1B650',
  400: '#7F9632',
  500: '#5B7A1E',   // signature
  600: '#4A6418',
  700: '#384C12',
  800: '#27340C',
  900: '#151C07',
};

// Black scale (neutrals, warm-cool)
const BLACK = {
  100: '#1C1B1A',
  200: '#242322',
  300: '#2E2D2C',
  400: '#3A3937',
  500: '#4A4946',
  600: '#5D5C58',
  700: '#7A7874',
  800: '#A19E99',
  900: '#C8C5BF',
};

// White scale (creams — warm off-white)
const WHITE = {
  100: '#FFFFFF',
  200: '#FCFAF5',
  300: '#F8F3EA',   // canonical cream
  400: '#F1EBDC',
  500: '#E7DFCB',
  600: '#D8CDB2',
  700: '#C3B594',
  800: '#A69878',
  900: '#867A5C',
};

// Semantic scales
const SEMANTIC = {
  red:    { 100:'#FBDDD5', 300:'#F28874', 500:'#EF4632', 700:'#BF2E1E', 900:'#7A1C12' },
  green:  { 100:'#C8F2DD', 300:'#6AD8A3', 500:'#00BC6D', 700:'#00894F', 900:'#004D2C' },
  gold:   { 100:'#F7E5B8', 300:'#E8C36B', 500:'#C89A24', 700:'#96710E', 900:'#5A4406' },
  yellow: { 100:'#FFF1B3', 300:'#FFD849', 500:'#FFBA00', 700:'#B88400', 900:'#6B4D00' },
  blue:   { 100:'#CDEEF5', 300:'#7BCBDC', 500:'#2F9DB5', 700:'#176E82', 900:'#0A3E4A' },
};

// Alpha overlays — cool black, warm cream
const ALPHA = {
  blackOn: { 5:'rgba(10,9,8,0.05)',  10:'rgba(10,9,8,0.10)',  20:'rgba(10,9,8,0.20)',  40:'rgba(10,9,8,0.40)',  60:'rgba(10,9,8,0.60)',  80:'rgba(10,9,8,0.80)' },
  creamOn: { 5:'rgba(248,243,234,0.05)', 10:'rgba(248,243,234,0.10)', 20:'rgba(248,243,234,0.22)', 40:'rgba(248,243,234,0.42)', 60:'rgba(248,243,234,0.66)', 80:'rgba(248,243,234,0.88)' },
};

// ─── PALETTE VARIANTS ───────────────────────────────────────────────
// "authentic" = direct TDS mapping. Others are considered variants that
// keep the TDS structure but swap the accent hue.
const PALETTES = {
  // 1. AUTHENTIC — direct mapping from TDS: cream + brand green
  authentic: {
    name: 'Authentic',
    nameAr: 'الأصلي',
    note: 'المواصفات الرسمية — أخضر ثمانية + كريمي دافئ',
    dark: {
      bg:            BLACK[100],
      surface:       BLACK[200],
      surfaceElev:   BLACK[300],
      surfaceSunken: '#0E0D0C',
      border:        ALPHA.creamOn[10],
      borderStrong:  ALPHA.creamOn[20],
      fg:            WHITE[300],
      fgMuted:       ALPHA.creamOn[60],
      fgSubtle:      ALPHA.creamOn[40],
      accent:        BRAND[300],
      accentHover:   BRAND[200],
      accentFg:      BLACK[100],
      success:       SEMANTIC.green[500],
      warn:          SEMANTIC.yellow[500],
      info:          SEMANTIC.blue[500],
      danger:        SEMANTIC.red[500],
      cream50:       WHITE[200],
      cream100:      WHITE[300],
      cream200:      WHITE[500],
      ink900:        BLACK[100],
      ink800:        BLACK[200],
      ink700:        BLACK[300],
    },
    light: {
      bg:            WHITE[300],
      surface:       WHITE[200],
      surfaceElev:   WHITE[100],
      surfaceSunken: WHITE[500],
      border:        ALPHA.blackOn[10],
      borderStrong:  ALPHA.blackOn[20],
      fg:            BLACK[100],
      fgMuted:       ALPHA.blackOn[60],
      fgSubtle:      ALPHA.blackOn[40],
      accent:        BRAND[500],
      accentHover:   BRAND[600],
      accentFg:      WHITE[200],
      success:       SEMANTIC.green[700],
      warn:          SEMANTIC.gold[500],
      info:          SEMANTIC.blue[700],
      danger:        SEMANTIC.red[700],
      cream50:       WHITE[200],
      cream100:      WHITE[300],
      cream200:      WHITE[500],
      ink900:        BLACK[100],
      ink800:        BLACK[200],
      ink700:        BLACK[300],
    }
  },

  // 2. EMBER — same structure, red accent instead of green
  ember: {
    name: 'Ember',
    nameAr: 'الجَمر',
    note: 'نفس البنية — لكن بأحمر ثمانية الكلاسيكي',
    dark: {
      bg: BLACK[100], surface: BLACK[200], surfaceElev: BLACK[300], surfaceSunken: '#0E0D0C',
      border: ALPHA.creamOn[10], borderStrong: ALPHA.creamOn[20],
      fg: WHITE[300], fgMuted: ALPHA.creamOn[60], fgSubtle: ALPHA.creamOn[40],
      accent: SEMANTIC.red[500], accentHover: SEMANTIC.red[300], accentFg: WHITE[100],
      success: SEMANTIC.green[500], warn: SEMANTIC.yellow[500], info: SEMANTIC.blue[500], danger: SEMANTIC.red[500],
      cream50: WHITE[200], cream100: WHITE[300], cream200: WHITE[500],
      ink900: BLACK[100], ink800: BLACK[200], ink700: BLACK[300],
    },
    light: {
      bg: WHITE[300], surface: WHITE[200], surfaceElev: WHITE[100], surfaceSunken: WHITE[500],
      border: ALPHA.blackOn[10], borderStrong: ALPHA.blackOn[20],
      fg: BLACK[100], fgMuted: ALPHA.blackOn[60], fgSubtle: ALPHA.blackOn[40],
      accent: SEMANTIC.red[700], accentHover: SEMANTIC.red[500], accentFg: WHITE[100],
      success: SEMANTIC.green[700], warn: SEMANTIC.gold[500], info: SEMANTIC.blue[700], danger: SEMANTIC.red[700],
      cream50: WHITE[200], cream100: WHITE[300], cream200: WHITE[500],
      ink900: BLACK[100], ink800: BLACK[200], ink700: BLACK[300],
    }
  },

  // 3. GOLD — editorial: warm gold accent on cream+ink
  gold: {
    name: 'Gold',
    nameAr: 'الذهب',
    note: 'نبرة تحريرية فاخرة — ذهب دافئ على كريمي',
    dark: {
      bg: BLACK[100], surface: BLACK[200], surfaceElev: BLACK[300], surfaceSunken: '#0E0D0C',
      border: ALPHA.creamOn[10], borderStrong: ALPHA.creamOn[20],
      fg: WHITE[300], fgMuted: ALPHA.creamOn[60], fgSubtle: ALPHA.creamOn[40],
      accent: SEMANTIC.gold[300], accentHover: SEMANTIC.gold[100], accentFg: BLACK[100],
      success: SEMANTIC.green[500], warn: SEMANTIC.yellow[500], info: SEMANTIC.blue[500], danger: SEMANTIC.red[500],
      cream50: WHITE[200], cream100: WHITE[300], cream200: WHITE[500],
      ink900: BLACK[100], ink800: BLACK[200], ink700: BLACK[300],
    },
    light: {
      bg: WHITE[300], surface: WHITE[200], surfaceElev: WHITE[100], surfaceSunken: WHITE[500],
      border: ALPHA.blackOn[10], borderStrong: ALPHA.blackOn[20],
      fg: BLACK[100], fgMuted: ALPHA.blackOn[60], fgSubtle: ALPHA.blackOn[40],
      accent: SEMANTIC.gold[700], accentHover: SEMANTIC.gold[500], accentFg: WHITE[200],
      success: SEMANTIC.green[700], warn: SEMANTIC.gold[700], info: SEMANTIC.blue[700], danger: SEMANTIC.red[700],
      cream50: WHITE[200], cream100: WHITE[300], cream200: WHITE[500],
      ink900: BLACK[100], ink800: BLACK[200], ink700: BLACK[300],
    }
  },
};

// ─── RADIUS ─────────────────────────────────────────────────────────
// TDS radius scale is an 11-step ramp; we expose named t-shirt sizes
// AND the raw scale for tokens cards.
const RADIUS_RAW = {
  r0: 0, r2: 2, r4: 4, r6: 6, r8: 8, r12: 12, r16: 16, r20: 20, r24: 24, r32: 32, rFull: 9999,
};

const RADII = {
  sharp:  { xs: 0,  sm: 0,  md: 2,  lg: 4,  xl: 6,  full: 9999, raw: RADIUS_RAW },
  soft:   { xs: 4,  sm: 8,  md: 12, lg: 16, xl: 24, full: 9999, raw: RADIUS_RAW },   // default — matches TDS button/card
  pill:   { xs: 8,  sm: 16, md: 22, lg: 28, xl: 36, full: 9999, raw: RADIUS_RAW },
};
// alias — "default" in the tweaks panel maps to soft
RADII.default = RADII.soft;

// ─── SPACING / DENSITY ──────────────────────────────────────────────
// TDS uses a 20-step scale on a 4px base: s0..s20 = 0,2,4,6,8,12,16,20,24,32,40,48,56,64,72,80,96,112,128,160
const SPACING_RAW = {
  s0:0, s1:2, s2:4, s3:6, s4:8, s5:12, s6:16, s7:20, s8:24, s9:32,
  s10:40, s11:48, s12:56, s13:64, s14:72, s15:80, s16:96, s17:112, s18:128, s19:160, s20:192,
};

const DENSITIES = {
  compact:      { unit: 3,  ctrlH: 32, rowH: 40, gutter: 16, raw: SPACING_RAW },
  comfortable:  { unit: 4,  ctrlH: 40, rowH: 56, gutter: 24, raw: SPACING_RAW },    // default — matches TDS
  spacious:     { unit: 5,  ctrlH: 48, rowH: 72, gutter: 32, raw: SPACING_RAW },
};

// ─── TYPE FAMILIES ──────────────────────────────────────────────────
const TYPE_FAMILIES = {
  thmanyah: {
    sans:    "'Thmanyah Sans','IBM Plex Sans Arabic',system-ui,sans-serif",
    display: "'Thmanyah Serif Display','Thmanyah Serif Text','Amiri',serif",
    text:    "'Thmanyah Serif Text','Thmanyah Serif Display','Amiri',serif",
    name: 'Thmanyah Sans × Serif Display',
    nameAr: 'ثمانية — العائلة الرسمية'
  },
  readex: {
    sans:    "'Readex Pro','IBM Plex Sans Arabic',sans-serif",
    display: "'Amiri','Noto Naskh Arabic',serif",
    text:    "'Amiri','Noto Naskh Arabic',serif",
    name: 'Readex × Amiri',
    nameAr: 'رديكس × أميري'
  },
  plex: {
    sans:    "'IBM Plex Sans Arabic',sans-serif",
    display: "'Amiri','Noto Naskh Arabic',serif",
    text:    "'Amiri','Noto Naskh Arabic',serif",
    name: 'Plex × Amiri',
    nameAr: 'بليكس × أميري'
  },
};

// ─── TYPE SCALE ─────────────────────────────────────────────────────
// Kept identical to before so existing surfaces don't shift.
const TYPE = {
  display1:  { size: 120, line: 1.02, weight: 700,  family: 'display', letter: '-0.02em' },
  display2:  { size: 88,  line: 1.04, weight: 700,  family: 'display', letter: '-0.02em' },
  display3:  { size: 64,  line: 1.05, weight: 700,  family: 'display', letter: '-0.02em' },
  h1:        { size: 48,  line: 1.1,  weight: 700,  family: 'sans',    letter: '-0.015em' },
  h2:        { size: 36,  line: 1.15, weight: 700,  family: 'sans',    letter: '-0.01em' },
  h3:        { size: 28,  line: 1.2,  weight: 600,  family: 'sans',    letter: '-0.005em' },
  h4:        { size: 22,  line: 1.25, weight: 600,  family: 'sans',    letter: '0' },
  h5:        { size: 18,  line: 1.3,  weight: 600,  family: 'sans',    letter: '0' },
  bodyLg:    { size: 18,  line: 1.55, weight: 400,  family: 'sans' },
  body:      { size: 16,  line: 1.55, weight: 400,  family: 'sans' },
  bodySm:    { size: 14,  line: 1.5,  weight: 400,  family: 'sans' },
  label:     { size: 13,  line: 1.35, weight: 500,  family: 'sans' },
  caption:   { size: 12,  line: 1.4,  weight: 400,  family: 'sans' },
  overline:  { size: 11,  line: 1.4,  weight: 600,  family: 'sans', letter: '0.1em',  upper: true },
  mono:      { size: 13,  line: 1.4,  weight: 500,  family: 'mono' },
};

// ─── SHADOWS ────────────────────────────────────────────────────────
const SHADOWS = {
  dark: {
    xs: '0 1px 2px rgba(0,0,0,0.4)',
    sm: '0 2px 6px rgba(0,0,0,0.35)',
    md: '0 6px 16px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.25)',
    lg: '0 16px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3)',
    xl: '0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)',
    glow: (c) => `0 0 0 1px ${c}, 0 6px 32px ${c}55`,
  },
  light: {
    xs: '0 1px 2px rgba(10,10,10,0.06)',
    sm: '0 2px 6px rgba(10,10,10,0.08)',
    md: '0 6px 16px rgba(10,10,10,0.10), 0 2px 4px rgba(10,10,10,0.05)',
    lg: '0 16px 40px rgba(10,10,10,0.14), 0 4px 12px rgba(10,10,10,0.06)',
    xl: '0 32px 80px rgba(10,10,10,0.18), 0 8px 24px rgba(10,10,10,0.08)',
    glow: (c) => `0 0 0 1px ${c}, 0 6px 32px ${c}33`,
  }
};

// ─── CONTEXT ────────────────────────────────────────────────────────
const TokensContext = React.createContext(null);

function useTokens() {
  return React.useContext(TokensContext);
}

function buildTokens({ palette, mode, radius, density, typeScale }) {
  const p = PALETTES[palette] || PALETTES.authentic;
  const c = p[mode] || p.dark;
  const r = RADII[radius] || RADII.soft;
  const d = DENSITIES[density] || DENSITIES.comfortable;
  const t = TYPE_FAMILIES[typeScale] || TYPE_FAMILIES.thmanyah;
  const s = SHADOWS[mode] || SHADOWS.dark;
  return {
    c, r, d, t, s,
    type: TYPE,
    palette, paletteMeta: p, mode, radius, density, typeScale,
    // raw scales for token cards
    BRAND, BLACK, WHITE, SEMANTIC, ALPHA, RADIUS_RAW, SPACING_RAW,
    PALETTES, RADII, DENSITIES, TYPE_FAMILIES
  };
}

// expose
window.BRAND = BRAND;
window.BLACK = BLACK;
window.WHITE = WHITE;
window.SEMANTIC = SEMANTIC;
window.ALPHA = ALPHA;
window.PALETTES = PALETTES;
window.RADII = RADII;
window.RADIUS_RAW = RADIUS_RAW;
window.DENSITIES = DENSITIES;
window.SPACING_RAW = SPACING_RAW;
window.TYPE_FAMILIES = TYPE_FAMILIES;
window.TYPE = TYPE;
window.SHADOWS = SHADOWS;
window.TokensContext = TokensContext;
window.useTokens = useTokens;
window.buildTokens = buildTokens;
