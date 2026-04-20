/* global React, useTokens, Text, Icon, ThmanyahLogo, DiamondGlyph, Badge */

function SurfaceSocial() {
  const tk = useTokens(); const { c, r, t } = tk;

  // 1080x1080 square post
  const Square = ({ children, bg, style }) => (
    <div style={{ width: 540, height: 540, background: bg || c.bg, borderRadius: 8, overflow:'hidden', position:'relative', color: c.fg, ...style }}>{children}</div>
  );

  // 1080x1920 story
  const Story = ({ children, bg, style }) => (
    <div style={{ width: 304, height: 540, background: bg || c.bg, borderRadius: 8, overflow:'hidden', position:'relative', color: c.fg, ...style }}>{children}</div>
  );

  return (
    <div style={{ background: c.surfaceSunken, minHeight:'100vh', padding: 48 }}>
      <Text v="overline" color={c.fgMuted} style={{ display:'block', marginBottom: 8 }}>قوالب التواصل الاجتماعي</Text>
      <h2 style={{ fontFamily:t.display, fontWeight:700, fontSize: 48, margin:0, marginBottom: 32, color: c.fg }}>مربّعات وستوريز</h2>

      <div style={{ display:'flex', gap: 32, flexWrap:'wrap' }}>
        {/* Square 1 — quote */}
        <Square bg={c.bg}>
          <div style={{ position:'absolute', insetInlineEnd:-40, top:-20, opacity:0.08 }}><DiamondGlyph size={280} color={c.accent}/></div>
          <div style={{ padding: 40, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative' }}>
            <ThmanyahLogo size={18} color={c.fg}/>
            <div>
              <Icon.Quote size={36} style={{ color: c.accent, marginBottom: 16 }}/>
              <p style={{ fontFamily:t.display, fontWeight:700, fontSize: 36, lineHeight:1.2, letterSpacing:'-0.02em', margin:0 }}>
                الصوت هو الطريقة الأقدم التي يَتذكّر بها العرب أنفسَهم.
              </p>
            </div>
            <div>
              <Text v="label" color={c.fg}>عبدالرحمن أبومالح</Text>
              <Text v="caption" color={c.fgMuted} style={{ display:'block' }}>المؤسس المشارك · فنجان #٣٢٠</Text>
            </div>
          </div>
        </Square>

        {/* Square 2 — episode promo */}
        <Square bg="#000" style={{ background:`linear-gradient(to top, ${c.bg}F5 0%, transparent 60%), url(assets/hero-2.png) center/cover` }}>
          <div style={{ padding: 32, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <Badge variant="accent" size="md">جديد</Badge>
              <ThmanyahLogo size={16} color="#fff"/>
            </div>
            <div>
              <Text v="caption" color={c.accent} style={{ display:'block', marginBottom:8 }}>فنجان · الحلقة ٣٢١</Text>
              <h3 style={{ fontFamily:t.display, fontWeight:700, fontSize: 44, lineHeight:1, letterSpacing:'-0.02em', margin:0, color:'#fff' }}>
                القيادة في زمن<br/>الذكاء الاصطناعي
              </h3>
              <Text v="bodySm" color="rgba(255,255,255,0.8)" style={{ display:'block', marginTop:16 }}>مع د. محمد العيسى · استمع الآن</Text>
            </div>
          </div>
        </Square>

        {/* Square 3 — big number */}
        <Square bg={c.accent} style={{ color: c.accentFg }}>
          <div style={{ padding: 40, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <Text v="overline" color={c.accentFg} style={{ opacity:0.7 }}>هذا العام</Text>
            <div>
              <span style={{ fontFamily:t.display, fontWeight:700, fontSize: 260, lineHeight:0.85, letterSpacing:'-0.04em' }}>٢٤M</span>
              <Text v="h4" color={c.accentFg} style={{ display:'block', marginTop:8 }}>مستمع شهرياً. شكراً لكم.</Text>
            </div>
            <ThmanyahLogo size={18} color={c.accentFg}/>
          </div>
        </Square>

        {/* Story 1 — announcement */}
        <Story bg={c.bg}>
          <div style={{ padding: 20, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <ThmanyahLogo size={14} color={c.fg}/>
              <Badge variant="live" size="sm" icon={<Icon.Live size={6}/>}>مباشر</Badge>
            </div>
            <div>
              <Text v="overline" color={c.accent} style={{ display:'block', marginBottom: 12 }}>حلقة الليلة · ٩م</Text>
              <h3 style={{ fontFamily:t.display, fontWeight:700, fontSize: 38, lineHeight:1, letterSpacing:'-0.02em', margin:0, color: c.fg }}>
                عاصفة في<br/>الجزيرة العربية
              </h3>
              <div style={{ width:'100%', height: 130, background:`url(assets/hero-3.png) center/cover`, borderRadius: r.md, marginTop: 16 }}/>
            </div>
            <div style={{ padding: '10px 14px', background: c.fg, color: c.bg, borderRadius: r.full, textAlign:'center', fontFamily:t.sans, fontSize: 13, fontWeight:600 }}>
              اسحب لأعلى للمشاهدة →
            </div>
          </div>
        </Story>

        {/* Story 2 — pullquote */}
        <Story bg={c.accent} style={{ color: c.accentFg }}>
          <div style={{ padding: 20, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative' }}>
            <ThmanyahLogo size={14} color={c.accentFg}/>
            <div>
              <Icon.Quote size={32} style={{ color: c.accentFg, opacity:0.8 }}/>
              <p style={{ fontFamily:t.display, fontWeight:700, fontSize: 30, lineHeight:1.15, letterSpacing:'-0.02em', marginBlock: 16, color: c.accentFg }}>
                نَروي ما لا يُروى. بصوت عربي واضح.
              </p>
            </div>
            <Text v="caption" color={c.accentFg} style={{ opacity:0.7 }}>@thmanyah</Text>
          </div>
        </Story>

        {/* Story 3 — stat */}
        <Story bg={c.surface}>
          <div style={{ padding: 20, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <ThmanyahLogo size={14} color={c.fg}/>
            <div style={{ textAlign:'start' }}>
              <Text v="overline" color={c.accent} style={{ display:'block' }}>الأكثر استماعاً</Text>
              <span style={{ fontFamily:t.display, fontWeight:700, fontSize: 180, lineHeight:0.9, letterSpacing:'-0.04em', color: c.fg }}>#١</span>
              <Text v="h5" color={c.fg} style={{ display:'block' }}>فنجان</Text>
              <Text v="bodySm" color={c.fgMuted}>بودكاست في العالم العربي — ٩ سنوات متتالية.</Text>
            </div>
            <Text v="caption" color={c.fgMuted}>شكراً ٢٤ مليوناً.</Text>
          </div>
        </Story>
      </div>
    </div>
  );
}

window.SurfaceSocial = SurfaceSocial;
