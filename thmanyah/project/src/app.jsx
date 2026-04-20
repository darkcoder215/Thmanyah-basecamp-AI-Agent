/* global React, ReactDOM, TokensContext, buildTokens, useTokens, Button, IconButton, Badge, Chip, Input, SearchField, Toggle, Checkbox, Radio, Card, Avatar, Tag, Progress, Divider, SectionTitle, NavBar, SidebarItem, MediaCard, PosterCard, ListItem, Stat, Alert, Menu, Tabs, Breadcrumb, EmptyState, Pullquote, KPI, TimelineRow, PlayerBar, Text, Icon, ThmanyahLogo, DiamondGlyph, TweaksPanel, SurfaceLanding, SurfaceApp, SurfacePlayer, SurfaceDeck, SurfaceReport, SurfaceSocial, SurfaceEmail */

function DSPage() {
  const [tweaks, setTweaks] = React.useState(window.TWEAKS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [tab, setTab] = React.useState('overview');

  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const tokens = buildTokens(tweaks);
  const { c, r, t, s, type } = tokens;

  // Apply to root for selection etc.
  React.useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', c.accent);
    document.body.style.background = c.bg;
    document.body.style.color = c.fg;
    document.documentElement.style.setProperty('--font-sans', t.sans);
    document.documentElement.style.setProperty('--font-display', t.display);
  }, [c.accent, c.bg, c.fg, t.sans, t.display]);

  const tabs = [
    { id:'overview', label:'نظرة عامّة' },
    { id:'tokens', label:'الأساسيات' },
    { id:'components', label:'المكوّنات' },
    { id:'landing', label:'الموقع' },
    { id:'app', label:'التطبيق' },
    { id:'player', label:'المشغّل' },
    { id:'deck', label:'العروض' },
    { id:'report', label:'التقارير' },
    { id:'social', label:'اجتماعي' },
    { id:'email', label:'البريد' },
  ];

  return (
    <TokensContext.Provider value={tokens}>
      <div data-screen-label={`DS ${tabs.find(x=>x.id===tab)?.label||''}`} style={{ fontFamily: t.sans, background: c.bg, color: c.fg, minHeight:'100vh' }}>

        {/* Global top bar */}
        <div style={{ position:'sticky', top:0, zIndex:50, background: `${c.bg}F2`, backdropFilter:'blur(18px)', borderBottom:`1px solid ${c.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:24, padding:'16px 32px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <ThmanyahLogo size={22} color={c.fg}/>
              <div style={{ width:1, height:20, background: c.border }}/>
              <Text v="label" color={c.fgMuted}>مَجال · Design System</Text>
            </div>
            <nav style={{ display:'flex', gap:4, marginInlineStart: 8, overflow:'auto' }}>
              {tabs.map(tb => (
                <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
                  background: tab===tb.id ? c.surfaceElev : 'transparent',
                  color: tab===tb.id ? c.fg : c.fgMuted,
                  border:'none', height:36, padding:'0 14px',
                  borderRadius: r.full,
                  fontFamily: t.sans, fontSize: 13, fontWeight:500, cursor:'pointer',
                  whiteSpace:'nowrap',
                }}>{tb.label}</button>
              ))}
            </nav>
            <div style={{ marginInlineStart:'auto', display:'flex', gap:10 }}>
              <Button variant="ghost" size="sm" icon={<Icon.Settings/>} onClick={()=>setTweaksOpen(!tweaksOpen)}>تخصيص</Button>
            </div>
          </div>
        </div>

        {/* Panels */}
        {tab === 'overview' && <Overview/>}
        {tab === 'tokens' && <TokensPanel/>}
        {tab === 'components' && <ComponentsPanel/>}
        {tab === 'landing' && <SurfaceLanding/>}
        {tab === 'app' && <SurfaceApp/>}
        {tab === 'player' && <SurfacePlayer/>}
        {tab === 'deck' && <SurfaceDeck/>}
        {tab === 'report' && <SurfaceReport/>}
        {tab === 'social' && <SurfaceSocial/>}
        {tab === 'email' && <SurfaceEmail/>}

        <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} visible={tweaksOpen} onClose={()=>setTweaksOpen(false)}/>
      </div>
    </TokensContext.Provider>
  );
}

// ─── OVERVIEW ──────────────────────────────────────────────────────
function Overview() {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <div style={{ position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', insetInlineEnd:-160, top:-80, opacity:0.06 }}><DiamondGlyph size={720} color={c.accent}/></div>

      <div style={{ maxWidth: 1280, margin:'0 auto', padding:'80px 48px', position:'relative' }}>
        <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:24 }}>نظام التصميم · الإصدار ١.٠</Text>
        <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize: 'clamp(72px, 11vw, 168px)', lineHeight:0.9, letterSpacing:'-0.03em', margin:0, color: c.fg }}>
          مَجال.<br/><span style={{ color: c.accent }}>نظام</span> ثمانية للتصميم.
        </h1>
        <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginTop:32, maxWidth:680, fontSize:22, lineHeight:1.55 }}>
          لغةٌ بصريّة واحدة لكل ما تُنتجه ثمانية — من الموقع إلى التطبيق، من العرض التقديمي إلى البريد.
          ثلاث شخصيّات لونية، خيارات كثافة وحدّة، مُكوَّنات تتكيّف معاً.
        </Text>

        {/* Quick stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 0, marginTop: 80, borderTop:`1px solid ${c.border}`, paddingTop: 40 }}>
          {[
            { v:'٣', l:'شخصيّات لونيّة' },
            { v:'٣٠+', l:'مكوّن أساسي' },
            { v:'٧', l:'سطح نموذجي' },
            { v:'١٠٠٪', l:'يدعم العربية' },
          ].map((s,i)=>(
            <div key={i} style={{ borderInlineEnd: i<3?`1px solid ${c.border}`:'none', paddingInline: 24 }}>
              <span style={{ fontFamily: t.display, fontWeight:700, fontSize: 72, lineHeight:1, color: c.fg, letterSpacing:'-0.03em' }}>{s.v}</span>
              <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginTop:12 }}>{s.l}</Text>
            </div>
          ))}
        </div>

        {/* Pillars */}
        <div style={{ marginTop: 120 }}>
          <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:16 }}>المبادئ</Text>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 24 }}>
            {[
              { n:'٠١', t:'بصوت عربي أولاً', d:'الاتجاه، الخطوط، الإيقاع، والمصطلحات — كلها مُصمّمة حول العربية، لا مُترجَمة.' },
              { n:'٠٢', t:'هدوء قبل الحيوية', d:'نستخدم المساحة والطباعة قبل اللون. اللمسة الحمراء تأتي للتأكيد، لا للثرثرة.' },
              { n:'٠٣', t:'مَرن لا هشّ', d:'ثلاث باليت × ثلاث حدّة × ثلاث كثافة = ٢٧ نظاماً يعمل. يعاد مزجه بدقيقة.' },
            ].map((p,i)=>(
              <Card key={i} variant="flat" padding={32}>
                <span style={{ fontFamily:t.display, fontWeight:700, fontSize: 56, color: c.accent, display:'block', lineHeight:1 }}>{p.n}</span>
                <Text v="h4" color={c.fg} style={{ display:'block', marginTop:16 }}>{p.t}</Text>
                <Text v="body" color={c.fgMuted} style={{ display:'block', marginTop:12 }}>{p.d}</Text>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TOKENS ────────────────────────────────────────────────────────
function TokensPanel() {
  const tk = useTokens(); const { c, r, t, d, type, PALETTES, RADII, DENSITIES, BRAND, BLACK, WHITE, SEMANTIC, RADIUS_RAW, SPACING_RAW } = tk;

  const Section = ({ title, overline, children }) => (
    <section style={{ marginBottom: 80 }}>
      <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:8 }}>{overline}</Text>
      <h2 style={{ fontFamily:t.display, fontWeight:700, fontSize: 56, margin:0, lineHeight:1, letterSpacing:'-0.02em', marginBottom: 40, color: c.fg }}>{title}</h2>
      {children}
    </section>
  );

  return (
    <div style={{ maxWidth: 1280, margin:'0 auto', padding:'64px 48px' }}>
      {/* PALETTES */}
      <Section overline="الألوان" title="ثلاث شخصيّات. نظامٌ واحد.">
        <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginBottom: 40, maxWidth: 720 }}>
          كلّ باليت يحمل مزاجاً ونبرة. اختر واحدة، والنظام يُعيد تلوين نفسه بالكامل.
        </Text>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 24 }}>
          {Object.keys(PALETTES).map(key=>{
            const p = PALETTES[key];
            const tkn = p.dark;
            return (
              <div key={key} style={{ border:`1px solid ${c.border}`, borderRadius: r.lg, overflow:'hidden' }}>
                <div style={{ background: tkn.bg, padding: 24, color: tkn.fg }}>
                  <Text v="overline" color={tkn.fgMuted}>{p.name}</Text>
                  <Text v="h3" color={tkn.fg} style={{ display:'block', marginTop:4 }}>{p.nameAr}</Text>
                  <Text v="bodySm" color={tkn.fgMuted} style={{ display:'block', marginTop:8 }}>{p.note}</Text>
                  <div style={{ display:'flex', gap:2, marginTop: 20 }}>
                    {[tkn.accent, tkn.fg, tkn.surfaceElev, tkn.surfaceSunken, tkn.bg].map((col,i)=>(
                      <div key={i} style={{ flex:1, height: 48, background: col, borderRadius: i===0?r.sm:0, border: col===tkn.bg?`1px solid ${tkn.border}`:'none' }}/>
                    ))}
                  </div>
                </div>
                <div style={{ background: p.light.bg, padding: 16, color: p.light.fg, borderTop:`1px solid ${c.border}` }}>
                  <div style={{ display:'flex', gap:2 }}>
                    {[p.light.accent, p.light.fg, p.light.surfaceElev, p.light.surfaceSunken, p.light.bg].map((col,i)=>(
                      <div key={i} style={{ flex:1, height: 32, background: col, borderRadius: i===0?r.sm:0, border: col===p.light.bg?`1px solid ${p.light.border}`:'none' }}/>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Full scale for current */}
        <div style={{ marginTop: 40 }}>
          <Text v="h4" color={c.fg} style={{ display:'block', marginBottom: 16 }}>الباليت الحاليّة — مُفصَّلة</Text>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 12 }}>
            {[
              ['bg', c.bg, 'bg'],
              ['surface', c.surface, 'surface'],
              ['surface-elev', c.surfaceElev, 'surface-elev'],
              ['surface-sunken', c.surfaceSunken, 'surface-sunken'],
              ['fg', c.fg, 'fg'],
              ['fg-muted', c.fgMuted, 'fg-muted'],
              ['accent', c.accent, 'accent'],
              ['accent-hover', c.accentHover, 'accent-hover'],
              ['success', c.success, 'success'],
              ['warn', c.warn, 'warn'],
              ['info', c.info, 'info'],
              ['danger', c.danger, 'danger'],
            ].map(([name, color, slug])=>(
              <div key={name}>
                <div style={{ height: 72, borderRadius: r.md, background: color, border: `1px solid ${c.border}` }}/>
                <Text v="label" color={c.fg} style={{ display:'block', marginTop: 8, fontFamily:'monospace', fontSize: 11 }}>{slug}</Text>
                <Text v="caption" color={c.fgSubtle} style={{ fontFamily:'monospace', fontSize:10 }}>{String(color).slice(0,14)}</Text>
              </div>
            ))}
          </div>
        </div>

        {/* Raw TDS scales */}
        <div style={{ marginTop: 64 }}>
          <Text v="h4" color={c.fg} style={{ display:'block', marginBottom: 8 }}>السلّم الخام — TDS</Text>
          <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginBottom: 24 }}>
            السلالم الأصلية المُستوردة من نظام ثمانية في Figma. يُشار إليها بالاسم في الأكواد، وتُركَّب عليها الرموز الدلالية.
          </Text>

          {[
            { name:'Brand · الأخضر المميّز', scale: BRAND, prefix: 'brand' },
            { name:'Black · النيوترال الداكن', scale: BLACK, prefix: 'black' },
            { name:'White · النيوترال الكريمي', scale: WHITE, prefix: 'white' },
          ].map(row=>(
            <div key={row.prefix} style={{ marginBottom: 24 }}>
              <Text v="label" color={c.fgMuted} style={{ display:'block', marginBottom: 10, fontFamily:'monospace' }}>{row.name}</Text>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(9, 1fr)', gap: 4 }}>
                {Object.entries(row.scale).map(([k,v])=>(
                  <div key={k}>
                    <div style={{ height: 56, background: v, borderRadius: r.sm, border:`1px solid ${c.border}` }}/>
                    <div style={{ fontFamily:'monospace', fontSize: 10, marginTop: 6, color: c.fgMuted }}>{row.prefix}/{k}</div>
                    <div style={{ fontFamily:'monospace', fontSize: 9, color: c.fgSubtle }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Semantic */}
          <div style={{ marginTop: 24 }}>
            <Text v="label" color={c.fgMuted} style={{ display:'block', marginBottom: 10, fontFamily:'monospace' }}>Semantic · الألوان الدلالية</Text>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 16 }}>
              {Object.entries(SEMANTIC).map(([name, scale])=>(
                <div key={name}>
                  <Text v="caption" color={c.fgMuted} style={{ display:'block', marginBottom: 6, fontFamily:'monospace' }}>{name}</Text>
                  <div style={{ display:'flex', borderRadius: r.sm, overflow:'hidden', border:`1px solid ${c.border}` }}>
                    {Object.values(scale).map((v,i)=>(
                      <div key={i} style={{ flex:1, height: 44, background: v }}/>
                    ))}
                  </div>
                  <div style={{ fontFamily:'monospace', fontSize: 10, marginTop: 6, color: c.fgSubtle }}>100 · 300 · 500 · 700 · 900</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* TYPE */}
      <Section overline="الطباعة" title="الخطّ يحمل المعنى.">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap: 40, alignItems:'start' }}>
          <div>
            <Text v="bodyLg" color={c.fgMuted}>
              نستخدم عائلتين — سانس للأجسام النصّية، وسيريف عربي كلاسيكي للعناوين الكبيرة.
              الهدف: جدّيّة دون تَصنُّع.
            </Text>
            <div style={{ marginTop: 24, padding: 20, background: c.surfaceElev, borderRadius: r.md }}>
              <Text v="overline" color={c.fgMuted} style={{ display:'block' }}>Sans</Text>
              <div style={{ fontFamily: t.sans, fontWeight:500, fontSize: 22, marginTop:4, color: c.fg }}>{tk.typeScale === 'thmanyah' ? 'Thmanyah Sans' : t.name.split('×')[0].trim()}</div>
              <Text v="overline" color={c.fgMuted} style={{ display:'block', marginTop:16 }}>Display</Text>
              <div style={{ fontFamily: t.display, fontWeight:700, fontSize: 28, marginTop:4, color: c.fg }}>{tk.typeScale === 'thmanyah' ? 'Thmanyah Serif' : t.name.split('×')[1]?.trim() || 'Amiri'}</div>
            </div>
          </div>
          <div>
            {[
              { v:'display1', l:'Display 1 · 120px', s:'ثمانية تروي' },
              { v:'display3', l:'Display 3 · 64px', s:'ما لا يُروى' },
              { v:'h2', l:'H2 · 36px · Sans', s:'رأسٌ رئيسيّ للأقسام' },
              { v:'h4', l:'H4 · 22px', s:'عنوان فرعي' },
              { v:'bodyLg', l:'Body Lg · 18px', s:'نصٌّ طويل للقراءة المريحة' },
              { v:'body', l:'Body · 16px', s:'النصّ الأساسي في الواجهات' },
              { v:'caption', l:'Caption · 12px', s:'بيانات وصفيّة، وقت، تصنيف' },
              { v:'overline', l:'OVERLINE · 11px', s:'OVERLINE TAG' },
            ].map(x=>(
              <div key={x.v} style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap: 24, padding:'18px 0', borderBottom:`1px solid ${c.border}`, alignItems:'baseline' }}>
                <Text v="caption" color={c.fgMuted} style={{ fontFamily:'monospace' }}>{x.l}</Text>
                <Text v={x.v} color={c.fg}>{x.s}</Text>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* RADII */}
      <Section overline="الحدّة" title="سلّم الحواف — ١١ خطوة.">
        <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginBottom: 32, maxWidth: 720 }}>
          سلّم خام من صفر إلى حواف كاملة. التبويبات تستخدم أسماء t-shirt (xs/sm/md/lg/xl) التي تتبدّل حسب الشخصية.
        </Text>
        <div style={{ background: c.surface, border:`1px solid ${c.border}`, borderRadius: r.lg, padding: 32 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(11, 1fr)', gap: 8 }}>
            {Object.entries(RADIUS_RAW).map(([k,v])=>(
              <div key={k} style={{ textAlign:'center' }}>
                <div style={{ aspectRatio:'1', background: c.accent, borderRadius: v }}/>
                <div style={{ fontFamily:'monospace', fontSize: 10, marginTop: 8, color: c.fgMuted }}>{k}</div>
                <div style={{ fontFamily:'monospace', fontSize: 9, color: c.fgSubtle }}>{v === 9999 ? '∞' : `${v}px`}</div>
              </div>
            ))}
          </div>
        </div>

        <Text v="label" color={c.fgMuted} style={{ display:'block', marginTop: 32, marginBottom: 12 }}>الشخصيّات — مقابل الأسماء الدلالية</Text>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 24 }}>
          {['sharp','default','pill'].map(rk=>{
            const rr = RADII[rk];
            return (
              <div key={rk} style={{ padding: 24, background: c.surface, borderRadius: r.lg, border:`1px solid ${c.border}` }}>
                <Text v="h5" color={c.fg}>{rk}</Text>
                <div style={{ display:'flex', gap: 8, marginTop: 16, alignItems:'flex-end' }}>
                  {[rr.xs, rr.sm, rr.md, rr.lg, rr.xl].map((v,i)=>(
                    <div key={i} style={{ flex:1, aspectRatio:'1', background: c.accent, borderRadius: v }}/>
                  ))}
                </div>
                <div style={{ display:'flex', gap: 8, marginTop: 8, fontFamily:'monospace', fontSize: 10, color: c.fgSubtle }}>
                  {['xs','sm','md','lg','xl'].map(k=><div key={k} style={{ flex:1, textAlign:'center' }}>{k}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* SPACING */}
      <Section overline="المسافة والكثافة" title="سلّم المسافات — ٢٠ خطوة.">
        <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginBottom: 32, maxWidth: 720 }}>
          السلّم الرسمي من TDS — يبدأ من ٠ وينمو بلطف إلى ١٩٢px. الكثافة تختار ثلاث طبقات ثابتة من هذا السلّم.
        </Text>
        <div style={{ background: c.surface, borderRadius: r.lg, padding: 32, border:`1px solid ${c.border}` }}>
          {Object.entries(SPACING_RAW).filter(([,v])=>v>0).map(([k,sp])=>(
            <div key={k} style={{ display:'flex', alignItems:'center', gap:24, padding:'6px 0' }}>
              <Text v="caption" color={c.fgMuted} style={{ fontFamily:'monospace', minWidth: 40 }}>{k}</Text>
              <Text v="caption" color={c.fgSubtle} style={{ fontFamily:'monospace', minWidth: 48 }}>{sp}px</Text>
              <div style={{ height: 10, width: Math.min(sp * 3, 600), background: c.accent, borderRadius: 2 }}/>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── COMPONENTS GALLERY ───────────────────────────────────────────
function ComponentsPanel() {
  const tk = useTokens(); const { c, r, t } = tk;
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(['option2']);

  const Card2 = ({ title, children }) => (
    <section style={{ marginBottom: 48 }}>
      <Text v="overline" color={c.fgMuted} style={{ display:'block', marginBottom:12 }}>{title}</Text>
      <div style={{ background: c.surface, border:`1px solid ${c.border}`, borderRadius: r.lg, padding: 32 }}>
        <div style={{ display:'flex', gap: 12, flexWrap:'wrap', alignItems:'center' }}>{children}</div>
      </div>
    </section>
  );

  const imgs = ['assets/show-1.png','assets/show-2.png','assets/show-3.png','assets/show-4.png'];

  return (
    <div style={{ maxWidth: 1280, margin:'0 auto', padding:'64px 48px' }}>
      <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:8 }}>المكتبة</Text>
      <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize: 72, margin:0, lineHeight:1, letterSpacing:'-0.02em', marginBottom: 40, color: c.fg }}>المكوّنات · ٣٠+</h1>

      <Card2 title="Buttons · الأزرار">
        <Button variant="primary">اشتراك</Button>
        <Button variant="primary" icon={<Icon.Play/>}>مشاهدة</Button>
        <Button variant="solid">رئيسي</Button>
        <Button variant="ghost">ثانوي</Button>
        <Button variant="subtle">هادئ</Button>
        <Button variant="link">رابط ←</Button>
        <Button variant="danger">حذف</Button>
        <Button variant="primary" size="sm">صغير</Button>
        <Button variant="primary" size="lg" icon={<Icon.Download/>}>تحميل</Button>
      </Card2>

      <Card2 title="Icon Buttons · أزرار الأيقونة">
        <IconButton icon={<Icon.Play/>} variant="accent"/>
        <IconButton icon={<Icon.Heart/>} variant="solid"/>
        <IconButton icon={<Icon.Share/>} variant="bordered"/>
        <IconButton icon={<Icon.Settings/>} variant="ghost"/>
        <IconButton icon={<Icon.More/>} variant="filled"/>
        <IconButton icon={<Icon.Bell/>} variant="ghost" size="sm"/>
        <IconButton icon={<Icon.Search/>} variant="ghost" size="lg"/>
      </Card2>

      <Card2 title="Badges · الشارات">
        <Badge variant="accent">جديد</Badge>
        <Badge variant="live" icon={<Icon.Live size={8}/>}>مباشر</Badge>
        <Badge variant="neutral">بودكاست</Badge>
        <Badge variant="outline">٢٠٢٦</Badge>
        <Badge variant="success">مُفعَّل</Badge>
        <Badge variant="warn">قريباً</Badge>
        <Badge variant="glass">4K · Dolby</Badge>
      </Card2>

      <Card2 title="Chips · رُقع التصفية">
        {['الكل','بودكاست','وثائقي','حوار','رياضة'].map((l,i)=>(
          <Chip key={l} selected={i===0}>{l}</Chip>
        ))}
      </Card2>

      <Card2 title="Inputs · الحقول">
        <SearchField placeholder="ابحث في المكتبة..."/>
        <Input placeholder="بريدك الإلكتروني" style={{ width: 280 }}/>
        <Toggle checked={true} onChange={()=>{}} label="التشغيل التلقائي"/>
        <Checkbox checked={true} onChange={()=>{}} label="إرسال النشرة"/>
        <Radio checked={true} onChange={()=>{}} label="مجّال شهري"/>
      </Card2>

      <Card2 title="Tabs · التبويبات">
        <Tabs variant="pills" value="a" onChange={()=>{}} items={[{id:'a',label:'الكل'},{id:'b',label:'بودكاست'},{id:'c',label:'وثائقي'}]}/>
      </Card2>

      <Card2 title="Stats · البيانات">
        <Stat value="٢٤M" label="مستمع شهرياً" trend="+٣٠٪"/>
        <div style={{ width: 24 }}/>
        <Stat value="٤.٨" unit="ساعة" label="الاستماع الشهري"/>
        <div style={{ width: 24 }}/>
        <KPI label="الإيرادات" value="١٢٠M"/>
        <KPI label="النمو" value="+٦٨٪" accent/>
      </Card2>

      <Card2 title="Media Cards · بطاقات المحتوى">
        <div style={{ display:'flex', gap: 16 }}>
          <MediaCard image={imgs[0]} title="فنجان" meta="بودكاست · ٣٢١ حلقة" duration="٤٨:٠٠" size="sm"/>
          <MediaCard image={imgs[1]} title="ثمانية وثائقي" meta="حي الآن" live size="sm"/>
          <PosterCard image={imgs[2]} title="أشياء غيّرتنا" category="وثائقي" size="sm"/>
          <PosterCard image={imgs[3]} title="صوتك عالي" category="حوار" size="sm"/>
        </div>
      </Card2>

      <Card2 title="Progress · التقدّم">
        <div style={{ width: 200 }}><Progress value={35}/></div>
        <div style={{ width: 200 }}><Progress value={78}/></div>
        <div style={{ width: 200 }}><Progress value={100} color={c.success}/></div>
      </Card2>

      <Card2 title="Alerts · التنبيهات">
        <div style={{ width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
          <Alert variant="success" icon={<Icon.Check/>} title="تم الاشتراك">بدأ اشتراكك الشهري. استمتع!</Alert>
          <Alert variant="warn" icon={<Icon.Bell/>} title="تحديث">تتوفّر نسخة أحدث من التطبيق.</Alert>
          <Alert variant="error" icon={<Icon.Close/>} title="خطأ">تعذّر حفظ التغييرات، حاول مرّة أخرى.</Alert>
          <Alert variant="info" icon={<Icon.Sparkle/>} title="جديد">أطلقنا عشر حلقات جديدة.</Alert>
        </div>
      </Card2>

      <Card2 title="Avatars & Tags">
        <Avatar name="أحمد العتيبي" badge/>
        <Avatar name="فاطمة" size={48}/>
        <Avatar name="سعود" size={56}/>
        <div style={{ width: 16 }}/>
        <Tag>بودكاست</Tag>
        <Tag>فنجان</Tag>
        <Tag onRemove={()=>{}}>وثائقي</Tag>
      </Card2>

      <Card2 title="Player Bar">
        <div style={{ width:'100%' }}>
          <PlayerBar image={imgs[0]} title="القيادة في زمن الذكاء" artist="فنجان · الحلقة ٣٢١" playing progress={42}/>
        </div>
      </Card2>

      <Card2 title="Quote">
        <div style={{ width:'100%' }}>
          <Pullquote attribution="عبدالرحمن أبومالح">الصوت ليس وسيطاً — بل ذاكرة.</Pullquote>
        </div>
      </Card2>

      <Card2 title="Empty State">
        <div style={{ width:'100%' }}>
          <EmptyState icon={<Icon.Library size={48}/>} title="مكتبتك فارغة" description="أضف برامجك المفضّلة لتُتابعها في مكان واحد." action={<Button variant="primary" icon={<Icon.Plus/>}>استكشف البرامج</Button>}/>
        </div>
      </Card2>
    </div>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById('root')).render(<DSPage/>);
