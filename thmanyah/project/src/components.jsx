/* global React, useTokens, Icon, Text, ThmanyahLogo, DiamondGlyph */

// ─── 1. BUTTON ──────────────────────────────────────────────────────
function Button({ variant='primary', size='md', children, icon, iconEnd, block, disabled, onClick, style, as='button', href, ...rest }) {
  const tk = useTokens();
  const { c, r, d, t } = tk;
  const sizes = {
    sm: { h: d.ctrlH - 8, px: 14, font: 13, iconSize: 14, gap: 6, radius: r.sm },
    md: { h: d.ctrlH,     px: 20, font: 14, iconSize: 16, gap: 8, radius: r.md },
    lg: { h: d.ctrlH + 8, px: 28, font: 16, iconSize: 18, gap: 10, radius: r.lg },
  };
  const s = sizes[size];
  const variants = {
    primary: { bg: c.accent, color: c.accentFg, border: 'transparent', hover: c.accentHover },
    solid:   { bg: c.fg, color: c.bg, border: 'transparent', hover: c.fg },
    ghost:   { bg: 'transparent', color: c.fg, border: c.border, hover: c.surfaceElev },
    subtle:  { bg: c.surfaceElev, color: c.fg, border: 'transparent', hover: c.surface },
    link:    { bg: 'transparent', color: c.accent, border: 'transparent', hover: 'transparent' },
    danger:  { bg: c.danger, color: '#fff', border: 'transparent', hover: c.danger },
  };
  const v = variants[variant];
  const [hover, setHover] = React.useState(false);
  const El = as;
  return (
    <El
      href={href}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: s.radius,
        background: hover && !disabled ? v.hover : v.bg,
        color: v.color,
        border: `1px solid ${v.border === 'transparent' ? 'transparent' : v.border}`,
        fontFamily: t.sans,
        fontWeight: 600,
        fontSize: s.font,
        letterSpacing: '0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textDecoration: variant === 'link' ? (hover ? 'underline' : 'none') : 'none',
        transition: 'background 160ms ease, transform 160ms ease',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {icon && <span style={{display:'inline-flex'}}>{React.cloneElement(icon, { size: s.iconSize })}</span>}
      {children}
      {iconEnd && <span style={{display:'inline-flex'}}>{React.cloneElement(iconEnd, { size: s.iconSize })}</span>}
    </El>
  );
}

// ─── 2. ICON BUTTON ─────────────────────────────────────────────────
function IconButton({ icon, variant='ghost', size='md', onClick, style, disabled, label, ...rest }) {
  const tk = useTokens();
  const { c, r } = tk;
  const sizes = { sm: 32, md: 40, lg: 48 };
  const iconSizes = { sm: 16, md: 18, lg: 20 };
  const variants = {
    ghost: { bg: 'transparent', color: c.fg, border: 'transparent', hover: c.surfaceElev },
    solid: { bg: c.fg, color: c.bg, border: 'transparent', hover: c.fg },
    accent:{ bg: c.accent, color: c.accentFg, border: 'transparent', hover: c.accentHover },
    bordered:{ bg: 'transparent', color: c.fg, border: c.border, hover: c.surfaceElev },
    filled:{ bg: c.surfaceElev, color: c.fg, border: 'transparent', hover: c.surface },
  };
  const v = variants[variant];
  const [hover, setHover] = React.useState(false);
  const sz = sizes[size];
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        width: sz, height: sz,
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        borderRadius: r.full,
        background: hover && !disabled ? v.hover : v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 160ms',
        ...style,
      }}
      {...rest}
    >
      {React.cloneElement(icon, { size: iconSizes[size] })}
    </button>
  );
}

// ─── 3. BADGE ───────────────────────────────────────────────────────
function Badge({ children, variant='neutral', size='md', icon, style }) {
  const tk = useTokens();
  const { c, r, t } = tk;
  const variants = {
    neutral: { bg: c.surfaceElev, color: c.fg, border: 'transparent' },
    accent:  { bg: c.accent, color: c.accentFg, border: 'transparent' },
    live:    { bg: c.danger, color: '#fff', border: 'transparent' },
    success: { bg: 'transparent', color: c.success, border: c.success },
    warn:    { bg: 'transparent', color: c.warn, border: c.warn },
    outline: { bg: 'transparent', color: c.fg, border: c.borderStrong },
    glass:   { bg: 'rgba(255,255,255,0.12)', color: c.fg, border: 'rgba(255,255,255,0.18)', backdrop: true },
  };
  const v = variants[variant];
  const sizes = { sm: { h: 20, px: 8, font: 11 }, md: { h: 26, px: 10, font: 12 }, lg: { h: 32, px: 14, font: 13 } };
  const s = sizes[size];
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      height: s.h, padding: `0 ${s.px}px`,
      borderRadius: r.full,
      background: v.bg, color: v.color,
      border: `1px solid ${v.border}`,
      fontFamily: t.sans, fontSize: s.font, fontWeight: 600,
      backdropFilter: v.backdrop ? 'blur(12px)' : undefined,
      letterSpacing: '0',
      ...style,
    }}>
      {icon}
      {children}
    </span>
  );
}

// ─── 4. CHIP / FILTER CHIP ──────────────────────────────────────────
function Chip({ children, selected, onClick, icon, style }) {
  const tk = useTokens();
  const { c, r, t, d } = tk;
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:6,
      height: d.ctrlH - 8, padding: '0 14px',
      borderRadius: r.full,
      background: selected ? c.fg : 'transparent',
      color: selected ? c.bg : c.fg,
      border: `1px solid ${selected ? c.fg : c.border}`,
      fontFamily: t.sans, fontSize: 13, fontWeight: 500,
      cursor:'pointer', transition:'all 160ms',
      ...style,
    }}>{icon}{children}</button>
  );
}

// ─── 5. INPUT ───────────────────────────────────────────────────────
function Input({ placeholder, icon, value, onChange, type='text', size='md', style, ...rest }) {
  const tk = useTokens();
  const { c, r, t, d } = tk;
  const sizes = { sm: d.ctrlH - 8, md: d.ctrlH, lg: d.ctrlH + 8 };
  const h = sizes[size];
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      position:'relative',
      display:'flex', alignItems:'center',
      height: h,
      paddingInline: icon ? '0 44px 0 16px' : '0 16px',
      borderRadius: r.md,
      background: c.surfaceElev,
      border: `1px solid ${focus ? c.accent : c.border}`,
      transition: 'border-color 160ms',
      ...style,
    }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={()=>setFocus(true)}
        onBlur={()=>setFocus(false)}
        style={{
          flex:1,
          height:'100%',
          background:'transparent', border:'none', outline:'none',
          color: c.fg,
          fontFamily: t.sans, fontSize: size==='sm'?13:14,
          direction:'rtl', textAlign:'right',
          padding: 0,
        }}
        {...rest}
      />
      {icon && <span style={{ position:'absolute', insetInlineStart: 14, color: c.fgMuted, display:'inline-flex' }}>{icon}</span>}
    </div>
  );
}

// ─── 6. SEARCH FIELD ────────────────────────────────────────────────
function SearchField({ placeholder='ابحث في المكتبة', value, onChange, block }) {
  return <Input icon={<Icon.Search size={18}/>} placeholder={placeholder} value={value} onChange={onChange} style={{ width: block ? '100%' : 360 }}/>;
}

// ─── 7. TOGGLE ──────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  const tk = useTokens();
  const { c, r } = tk;
  return (
    <label style={{ display:'inline-flex', gap:10, alignItems:'center', cursor:'pointer' }}>
      <span onClick={()=>onChange(!checked)} style={{
        width: 40, height: 24, borderRadius: r.full,
        background: checked ? c.accent : c.surfaceSunken,
        border: `1px solid ${c.border}`,
        position:'relative', transition:'all 160ms',
      }}>
        <span style={{
          position:'absolute', top:2,
          insetInlineStart: checked ? 18 : 2,
          width:18, height:18, borderRadius:'50%',
          background:'#fff',
          transition:'all 160ms',
        }}/>
      </span>
      {label && <Text v="bodySm" color={c.fg}>{label}</Text>}
    </label>
  );
}

// ─── 8. CHECKBOX ────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }) {
  const tk = useTokens(); const { c, r } = tk;
  return (
    <label style={{ display:'inline-flex', gap:8, alignItems:'center', cursor:'pointer' }}>
      <span onClick={()=>onChange(!checked)} style={{
        width:20, height:20, borderRadius: r.xs,
        border:`1.5px solid ${checked ? c.accent : c.borderStrong}`,
        background: checked ? c.accent : 'transparent',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        color:'#fff', transition:'all 160ms',
      }}>{checked && <Icon.Check size={14} strokeWidth={3}/>}</span>
      {label && <Text v="bodySm" color={c.fg}>{label}</Text>}
    </label>
  );
}

// ─── 9. RADIO ───────────────────────────────────────────────────────
function Radio({ checked, onChange, label }) {
  const tk = useTokens(); const { c } = tk;
  return (
    <label style={{ display:'inline-flex', gap:8, alignItems:'center', cursor:'pointer' }}>
      <span onClick={onChange} style={{
        width:20, height:20, borderRadius:'50%',
        border:`1.5px solid ${checked ? c.accent : c.borderStrong}`,
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}>{checked && <span style={{ width:10, height:10, borderRadius:'50%', background:c.accent }}/>}</span>
      {label && <Text v="bodySm" color={c.fg}>{label}</Text>}
    </label>
  );
}

// ─── 10. CARD (Container) ───────────────────────────────────────────
function Card({ children, style, padding=24, interactive, onClick, variant='elev' }) {
  const tk = useTokens(); const { c, r, s } = tk;
  const variants = {
    elev:  { bg: c.surfaceElev, border: 'transparent', shadow: s.sm },
    flat:  { bg: c.surface, border: c.border, shadow: 'none' },
    outline:{ bg: 'transparent', border: c.border, shadow: 'none' },
    sunken:{ bg: c.surfaceSunken, border: 'transparent', shadow: 'none' },
  };
  const v = variants[variant];
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={interactive ? ()=>setHover(true) : undefined}
      onMouseLeave={interactive ? ()=>setHover(false) : undefined}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: r.lg,
        padding,
        boxShadow: interactive && hover ? s.md : v.shadow,
        transform: interactive && hover ? 'translateY(-2px)' : 'none',
        transition: 'all 200ms ease',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─── 11. AVATAR ─────────────────────────────────────────────────────
function Avatar({ src, name, size=40, style, badge }) {
  const tk = useTokens(); const { c, r, t } = tk;
  const initials = (name||'').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('');
  return (
    <div style={{ position:'relative', width:size, height:size, display:'inline-block', ...style }}>
      <div style={{
        width:size, height:size, borderRadius:'50%',
        background: src ? `url(${src}) center/cover` : c.accent,
        color: c.accentFg,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily: t.sans, fontWeight:700, fontSize: size*0.38,
      }}>{!src && initials}</div>
      {badge && <div style={{
        position:'absolute', bottom:-2, insetInlineEnd:-2,
        width: size*0.3, height: size*0.3, borderRadius:'50%',
        background: c.success, border:`2px solid ${c.bg}`,
      }}/>}
    </div>
  );
}

// ─── 12. TAG ────────────────────────────────────────────────────────
function Tag({ children, onRemove }) {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      height: 26, padding: '0 10px',
      background: c.surfaceSunken, color: c.fg,
      borderRadius: r.xs,
      fontFamily: t.sans, fontSize: 12, fontWeight: 500,
    }}>{children}{onRemove && <Icon.Close size={12} style={{cursor:'pointer', opacity:0.7}} onClick={onRemove}/>}</span>
  );
}

// ─── 13. PROGRESS BAR ───────────────────────────────────────────────
function Progress({ value=0, max=100, color, bg, height=4, style }) {
  const tk = useTokens(); const { c, r } = tk;
  return (
    <div style={{
      width:'100%', height, borderRadius: r.full,
      background: bg || c.surfaceSunken,
      overflow:'hidden', ...style,
    }}>
      <div style={{ width: `${(value/max)*100}%`, height:'100%', background: color || c.accent, borderRadius: r.full, transition:'width 300ms' }}/>
    </div>
  );
}

// ─── 14. DIVIDER ────────────────────────────────────────────────────
function Divider({ vertical, style, label }) {
  const tk = useTokens(); const { c } = tk;
  if (vertical) return <div style={{ width:1, alignSelf:'stretch', background: c.border, ...style }}/>;
  if (label) return (
    <div style={{ display:'flex', alignItems:'center', gap:12, ...style }}>
      <div style={{ flex:1, height:1, background: c.border }}/>
      <Text v="caption" color={c.fgMuted}>{label}</Text>
      <div style={{ flex:1, height:1, background: c.border }}/>
    </div>
  );
  return <div style={{ width:'100%', height:1, background: c.border, ...style }}/>;
}

// ─── 15. SECTION TITLE ──────────────────────────────────────────────
function SectionTitle({ title, subtitle, action, overline }) {
  const tk = useTokens(); const { c } = tk;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, marginBottom: 20 }}>
      <div>
        {overline && <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:8 }}>{overline}</Text>}
        <Text as="h2" v="h3" color={c.fg} style={{ display:'block' }}>{title}</Text>
        {subtitle && <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginTop:4 }}>{subtitle}</Text>}
      </div>
      {action}
    </div>
  );
}

// ─── 16. NAV BAR ────────────────────────────────────────────────────
function NavBar({ items, active, onNav, right }) {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 24,
      height: 72, paddingInline: 32,
      background: c.bg,
      borderBottom: `1px solid ${c.border}`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
        <ThmanyahLogo size={22} color={c.fg}/>
      </div>
      <nav style={{ display:'flex', gap: 4, marginInlineStart: 12 }}>
        {items.map(it => (
          <button key={it.id} onClick={()=>onNav(it.id)} style={{
            background: active===it.id ? c.surfaceElev : 'transparent',
            color: active===it.id ? c.fg : c.fgMuted,
            border:'none', height:40, padding:'0 14px',
            borderRadius: r.full,
            fontFamily: t.sans, fontSize:14, fontWeight:500, cursor:'pointer',
            transition:'all 140ms',
          }}>{it.label}</button>
        ))}
      </nav>
      <div style={{ marginInlineStart:'auto', display:'flex', alignItems:'center', gap: 12 }}>
        {right}
      </div>
    </div>
  );
}

// ─── 17. SIDEBAR ITEM ───────────────────────────────────────────────
function SidebarItem({ icon, label, active, onClick, count }) {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <button onClick={onClick} style={{
      width:'100%',
      display:'flex', alignItems:'center', gap:12,
      height: 44, paddingInline: 14,
      borderRadius: r.md,
      background: active ? c.surfaceElev : 'transparent',
      color: active ? c.fg : c.fgMuted,
      border:'none', cursor:'pointer',
      fontFamily: t.sans, fontSize: 14, fontWeight: 500,
      textAlign: 'right',
      transition:'all 140ms',
    }}>
      {icon && React.cloneElement(icon, { size: 18 })}
      <span style={{ flex:1 }}>{label}</span>
      {count !== undefined && <span style={{ fontSize:12, color: c.fgSubtle }}>{count}</span>}
    </button>
  );
}

// ─── 18. MEDIA CARD (content card) ──────────────────────────────────
function MediaCard({ image, title, meta, duration, live, onClick, size='md' }) {
  const tk = useTokens(); const { c, r, t, s } = tk;
  const sizes = { sm: { w: 200, h: 112 }, md: { w: 280, h: 160 }, lg: { w: 360, h: 200 }, xl: { w: 480, h: 270 } };
  const sz = sizes[size];
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ width: sz.w, cursor:'pointer', transition:'all 240ms' }}>
      <div style={{
        position:'relative',
        width: sz.w, height: sz.h,
        borderRadius: r.lg,
        background: `url(${image}) center/cover, ${c.surfaceElev}`,
        overflow:'hidden',
        boxShadow: hover ? s.lg : s.sm,
        transform: hover ? 'translateY(-3px)' : 'none',
        transition:'all 240ms',
      }}>
        {live && <div style={{ position:'absolute', top:12, insetInlineStart:12 }}>
          <Badge variant="live" size="sm" icon={<Icon.Live size={8}/>}>مباشر</Badge>
        </div>}
        {duration && !live && <div style={{
          position:'absolute', bottom:10, insetInlineStart:10,
          padding:'2px 8px', borderRadius: r.xs,
          background:'rgba(0,0,0,0.72)', color:'#fff',
          fontFamily:t.sans, fontSize:11, fontWeight:500,
          backdropFilter:'blur(4px)',
        }}>{duration}</div>}
        {hover && <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          background:'linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.1))',
        }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', color:'#000' }}>
            <Icon.Play size={22}/>
          </div>
        </div>}
      </div>
      <div style={{ paddingTop: 12 }}>
        <Text v="h5" color={c.fg} style={{ display:'block', marginBottom: 4, lineHeight:1.3 }}>{title}</Text>
        {meta && <Text v="caption" color={c.fgMuted}>{meta}</Text>}
      </div>
    </div>
  );
}

// ─── 19. POSTER CARD (vertical / show card) ─────────────────────────
function PosterCard({ image, title, category, size='md', onClick }) {
  const tk = useTokens(); const { c, r, t } = tk;
  const sizes = { sm: { w: 140, h: 200 }, md: { w: 180, h: 260 }, lg: { w: 220, h: 320 } };
  const sz = sizes[size];
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{ width: sz.w, cursor:'pointer' }}>
      <div style={{
        width: sz.w, height: sz.h,
        borderRadius: r.lg,
        background:`url(${image}) center/cover, ${c.surfaceElev}`,
        transform: hover ? 'scale(1.02)' : 'scale(1)',
        transition:'all 240ms',
        border: `1px solid ${c.border}`,
      }}/>
      <div style={{ paddingTop: 10 }}>
        <Text v="label" color={c.fg} style={{ display:'block' }}>{title}</Text>
        {category && <Text v="caption" color={c.fgMuted}>{category}</Text>}
      </div>
    </div>
  );
}

// ─── 20. LIST ITEM ──────────────────────────────────────────────────
function ListItem({ image, title, subtitle, end, onClick, density='md' }) {
  const tk = useTokens(); const { c, r } = tk;
  const heights = { sm: 56, md: 72, lg: 88 };
  const imgSizes = { sm: 40, md: 56, lg: 72 };
  const [hover, setHover] = React.useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:14,
        height: heights[density], paddingInline: 12,
        borderRadius: r.md,
        background: hover ? c.surfaceElev : 'transparent',
        cursor:'pointer', transition:'background 140ms',
      }}>
      {image && <div style={{ width:imgSizes[density], height:imgSizes[density], borderRadius:r.sm, background:`url(${image}) center/cover, ${c.surfaceElev}`, flexShrink:0 }}/>}
      <div style={{ flex:1, minWidth:0 }}>
        <Text v="label" color={c.fg} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</Text>
        {subtitle && <Text v="caption" color={c.fgMuted} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{subtitle}</Text>}
      </div>
      {end}
    </div>
  );
}

// ─── 21. STAT / DATA POINT ──────────────────────────────────────────
function Stat({ value, label, trend, unit, style, large }) {
  const tk = useTokens(); const { c, t } = tk;
  return (
    <div style={{ ...style }}>
      <div style={{ display:'flex', alignItems:'baseline', gap: 6 }}>
        <span style={{
          fontFamily: t.display, fontWeight: 700,
          fontSize: large ? 96 : 48, lineHeight: 1, color: c.fg, letterSpacing:'-0.03em',
        }}>{value}</span>
        {unit && <Text v="h4" color={c.fgMuted}>{unit}</Text>}
      </div>
      {label && <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginTop: 8 }}>{label}</Text>}
      {trend && <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:10, color: c.success }}>
        <Icon.Trend size={14}/><Text v="caption">{trend}</Text>
      </div>}
    </div>
  );
}

// ─── 22. ALERT / TOAST ──────────────────────────────────────────────
function Alert({ variant='info', title, children, icon, onClose, style }) {
  const tk = useTokens(); const { c, r, t } = tk;
  const variants = {
    info:    { border: c.info, bg: `${c.info}18` },
    success: { border: c.success, bg: `${c.success}18` },
    warn:    { border: c.warn, bg: `${c.warn}18` },
    error:   { border: c.danger, bg: `${c.danger}18` },
  };
  const v = variants[variant];
  return (
    <div style={{
      display:'flex', gap:12, padding:14,
      background: v.bg, borderRadius: r.md,
      border:`1px solid ${v.border}`,
      ...style,
    }}>
      {icon && <div style={{ color: v.border, marginTop: 2 }}>{icon}</div>}
      <div style={{ flex:1 }}>
        {title && <Text v="label" color={c.fg} style={{ display:'block', marginBottom:2 }}>{title}</Text>}
        <Text v="bodySm" color={c.fgMuted}>{children}</Text>
      </div>
      {onClose && <IconButton icon={<Icon.Close/>} size="sm" onClick={onClose}/>}
    </div>
  );
}

// ─── 23. DROPDOWN MENU ──────────────────────────────────────────────
function Menu({ items, trigger }) {
  const tk = useTokens(); const { c, r, t, s } = tk;
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      <div onClick={()=>setOpen(!open)}>{trigger}</div>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, zIndex: 9 }}/>
          <div style={{
            position:'absolute', top:'calc(100% + 6px)', insetInlineStart: 0, zIndex: 10,
            minWidth: 220,
            background: c.surfaceElev,
            border:`1px solid ${c.border}`,
            borderRadius: r.md,
            padding: 6,
            boxShadow: s.lg,
          }}>
            {items.map((it, i) => it.divider ? <Divider key={i} style={{ margin:'6px 0' }}/> : (
              <button key={i} onClick={()=>{ it.onClick?.(); setOpen(false); }} style={{
                width:'100%',
                display:'flex', alignItems:'center', gap:10,
                height:36, padding:'0 10px',
                background:'transparent', border:'none', cursor:'pointer',
                color: it.danger ? c.danger : c.fg,
                fontFamily: t.sans, fontSize:13, textAlign:'right',
                borderRadius: r.sm,
              }}
              onMouseEnter={e=>e.currentTarget.style.background=c.surface}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >{it.icon}{it.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 24. TABS ───────────────────────────────────────────────────────
function Tabs({ items, value, onChange, variant='underline' }) {
  const tk = useTokens(); const { c, r, t } = tk;
  if (variant === 'pills') {
    return (
      <div style={{ display:'inline-flex', gap: 4, background: c.surfaceElev, padding:4, borderRadius: r.full }}>
        {items.map(it => (
          <button key={it.id} onClick={()=>onChange(it.id)} style={{
            height:32, padding:'0 14px',
            background: value===it.id ? c.fg : 'transparent',
            color: value===it.id ? c.bg : c.fgMuted,
            border:'none', borderRadius: r.full, cursor:'pointer',
            fontFamily:t.sans, fontSize:13, fontWeight:600, transition:'all 160ms',
          }}>{it.label}</button>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display:'flex', gap: 28, borderBottom:`1px solid ${c.border}` }}>
      {items.map(it => (
        <button key={it.id} onClick={()=>onChange(it.id)} style={{
          background:'transparent', border:'none', cursor:'pointer',
          padding:'12px 0',
          color: value===it.id ? c.fg : c.fgMuted,
          borderBottom: value===it.id ? `2px solid ${c.accent}` : '2px solid transparent',
          marginBottom:-1,
          fontFamily:t.sans, fontSize:14, fontWeight:600,
        }}>{it.label}</button>
      ))}
    </div>
  );
}

// ─── 25. BREADCRUMB ─────────────────────────────────────────────────
function Breadcrumb({ items }) {
  const tk = useTokens(); const { c } = tk;
  return (
    <nav style={{ display:'flex', alignItems:'center', gap: 8 }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon.ChevL size={14} style={{ color: c.fgSubtle }}/>}
          <Text v="bodySm" color={i === items.length-1 ? c.fg : c.fgMuted}>{it}</Text>
        </React.Fragment>
      ))}
    </nav>
  );
}

// ─── 26. EMPTY STATE ────────────────────────────────────────────────
function EmptyState({ icon, title, description, action }) {
  const tk = useTokens(); const { c } = tk;
  return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <div style={{ color: c.fgSubtle, marginBottom: 16, display:'inline-flex' }}>{icon}</div>
      <Text v="h5" color={c.fg} style={{ display:'block', marginBottom:6 }}>{title}</Text>
      <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginBottom: 20, maxWidth: 360, margin: '0 auto 20' }}>{description}</Text>
      {action}
    </div>
  );
}

// ─── 27. QUOTE / PULLQUOTE ──────────────────────────────────────────
function Pullquote({ children, attribution, style }) {
  const tk = useTokens(); const { c, t } = tk;
  return (
    <blockquote style={{
      margin:0, padding:'24px 0',
      borderTop:`1px solid ${c.border}`, borderBottom:`1px solid ${c.border}`,
      ...style,
    }}>
      <Icon.Quote size={32} style={{ color: c.accent, marginBottom: 12 }}/>
      <p style={{
        fontFamily: t.display, fontWeight: 700, fontSize: 28, lineHeight: 1.3,
        color: c.fg, margin: 0, letterSpacing:'-0.01em',
      }}>{children}</p>
      {attribution && <Text v="caption" color={c.fgMuted} style={{ display:'block', marginTop: 16 }}>— {attribution}</Text>}
    </blockquote>
  );
}

// ─── 28. KPI CHIP (data element) ────────────────────────────────────
function KPI({ label, value, accent }) {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <div style={{
      display:'inline-flex', flexDirection:'column', gap: 4,
      padding: '14px 18px',
      background: accent ? c.accent : c.surfaceElev,
      color: accent ? c.accentFg : c.fg,
      borderRadius: r.md,
      minWidth: 140,
    }}>
      <Text v="caption" color={accent ? c.accentFg : c.fgMuted} style={{ opacity: accent?0.8:1 }}>{label}</Text>
      <span style={{ fontFamily: t.display, fontWeight:700, fontSize: 32, lineHeight:1, letterSpacing:'-0.02em' }}>{value}</span>
    </div>
  );
}

// ─── 29. TIMELINE ITEM ──────────────────────────────────────────────
function TimelineRow({ time, title, description, icon, last }) {
  const tk = useTokens(); const { c } = tk;
  return (
    <div style={{ display:'flex', gap: 14 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius:'50%',
          background: c.accent, color: c.accentFg,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{icon || <Icon.Sparkle size={14}/>}</div>
        {!last && <div style={{ flex:1, width:2, background: c.border, marginTop: 4, minHeight: 30 }}/>}
      </div>
      <div style={{ flex:1, paddingBottom: last ? 0 : 24 }}>
        {time && <Text v="caption" color={c.fgMuted} style={{ display:'block' }}>{time}</Text>}
        <Text v="label" color={c.fg} style={{ display:'block', marginTop:2 }}>{title}</Text>
        {description && <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginTop: 4 }}>{description}</Text>}
      </div>
    </div>
  );
}

// ─── 30. PLAYER BAR (audio/video mini-player) ───────────────────────
function PlayerBar({ image, title, artist, playing, onToggle, progress=45, duration }) {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:16,
      padding:'12px 16px',
      background: c.surfaceElev,
      border:`1px solid ${c.border}`,
      borderRadius: r.lg,
    }}>
      <div style={{ width: 56, height:56, borderRadius: r.sm, background:`url(${image}) center/cover, ${c.surface}`, flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <Text v="label" color={c.fg} style={{ display:'block' }}>{title}</Text>
        <Text v="caption" color={c.fgMuted}>{artist}</Text>
        <div style={{ marginTop: 6 }}>
          <Progress value={progress} height={3}/>
        </div>
      </div>
      <IconButton icon={playing ? <Icon.Pause/> : <Icon.Play/>} variant="solid" size="md" onClick={onToggle}/>
    </div>
  );
}

// Expose
Object.assign(window, {
  Button, IconButton, Badge, Chip, Input, SearchField, Toggle, Checkbox, Radio,
  Card, Avatar, Tag, Progress, Divider, SectionTitle, NavBar, SidebarItem,
  MediaCard, PosterCard, ListItem, Stat, Alert, Menu, Tabs, Breadcrumb,
  EmptyState, Pullquote, KPI, TimelineRow, PlayerBar,
});
