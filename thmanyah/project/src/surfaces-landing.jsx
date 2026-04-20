/* global React, useTokens, Button, IconButton, Badge, Chip, SearchField, Card, MediaCard, PosterCard, SectionTitle, NavBar, Text, Icon, ThmanyahLogo, DiamondGlyph */

function SurfaceLanding() {
  const tk = useTokens(); const { c, r, t, s } = tk;
  return (
    <div style={{ background: c.bg, color: c.fg, minHeight: '100vh' }}>
      {/* Nav */}
      <div style={{ display:'flex', alignItems:'center', gap:32, padding:'24px 48px', borderBottom:`1px solid ${c.border}` }}>
        <ThmanyahLogo size={26} color={c.fg}/>
        <nav style={{ display:'flex', gap:28, marginInlineStart:24 }}>
          {['المكتبة','البرامج','المباريات','المدونة','من نحن'].map((l,i)=>(
            <Text key={i} v="bodySm" color={i===0?c.fg:c.fgMuted} style={{ cursor:'pointer' }}>{l}</Text>
          ))}
        </nav>
        <div style={{ marginInlineStart:'auto', display:'flex', gap:12, alignItems:'center' }}>
          <Button variant="ghost" size="sm">تسجيل الدخول</Button>
          <Button variant="primary" size="sm">اشترك الآن</Button>
        </div>
      </div>

      {/* Hero — full-bleed editorial */}
      <section style={{ position:'relative', padding:'96px 48px 120px', overflow:'hidden' }}>
        <div style={{ position:'absolute', insetInlineEnd:-80, top:40, opacity:0.08 }}>
          <DiamondGlyph size={520} color={c.accent}/>
        </div>
        <div style={{ position:'relative', maxWidth: 1280, margin:'0 auto' }}>
          <Badge variant="outline" size="md" style={{ marginBottom:24 }}>الموسم الثامن · أبريل ٢٠٢٦</Badge>
          <h1 style={{
            fontFamily: t.display, fontWeight: 700, fontSize: 'clamp(56px, 9vw, 144px)',
            lineHeight: 0.95, letterSpacing: '-0.03em', margin: 0,
            color: c.fg,
          }}>
            نَروي ما لا يُروى.<br/>
            <span style={{ color: c.accent }}>بصوت عربي</span> واضح.
          </h1>
          <p style={{
            maxWidth: 640, marginTop: 32, fontSize: 20, lineHeight: 1.55,
            color: c.fgMuted, fontFamily: t.sans,
          }}>
            منصة الإنتاج الصوتي والمرئي الرائدة في العالم العربي. بودكاست، وثائقيات، رياضة، ومحتوى حصري — في مكان واحد.
          </p>
          <div style={{ display:'flex', gap:12, marginTop: 40 }}>
            <Button variant="primary" size="lg" icon={<Icon.Play/>}>ابدأ المشاهدة</Button>
            <Button variant="ghost" size="lg">استكشف الكتالوج</Button>
          </div>

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 0, marginTop: 80, borderTop:`1px solid ${c.border}`, paddingTop: 32 }}>
            {[
              { v:'٢٤', u:'مليون', l:'مستمع شهرياً' },
              { v:'٨٠٠+', u:'', l:'حلقة وثائقية' },
              { v:'١٢', u:'', l:'لغة عربية متاحة' },
              { v:'٢٠١٦', u:'', l:'تأسست في' },
            ].map((s,i)=>(
              <div key={i} style={{ borderInlineEnd: i<3?`1px solid ${c.border}`:'none', paddingInline: 24 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontFamily: t.display, fontWeight:700, fontSize: 64, lineHeight:1, color: c.fg, letterSpacing:'-0.03em' }}>{s.v}</span>
                  {s.u && <Text v="h4" color={c.fgMuted}>{s.u}</Text>}
                </div>
                <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginTop:8 }}>{s.l}</Text>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section style={{ padding:'64px 48px', background: c.surface }}>
        <div style={{ maxWidth: 1280, margin:'0 auto' }}>
          <SectionTitle overline="الأكثر مشاهدة" title="ما يشاهده العرب الآن"
            action={<Button variant="ghost" size="sm" iconEnd={<Icon.ArrowL/>}>الكل</Button>}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 24 }}>
            {[
              { img:'assets/show-1.png', t:'فنجان', m:'بودكاست · ٣٢١ حلقة' },
              { img:'assets/show-2.png', t:'ثمانية', m:'فيلم وثائقي · ٥٢ دقيقة', live:true },
              { img:'assets/show-3.png', t:'أشياء غيّرتنا', m:'وثائقي · ١٢ حلقة' },
              { img:'assets/doc-1.png', t:'صوتك عالي', m:'حوار · ٤٥ دقيقة' },
            ].map((it,i)=>(
              <MediaCard key={i} image={it.img} title={it.t} meta={it.m} live={it.live} size="md"/>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial CTA band */}
      <section style={{ padding:'96px 48px', background: c.accent, color: c.accentFg }}>
        <div style={{ maxWidth: 1200, margin:'0 auto', display:'grid', gridTemplateColumns:'1.2fr 1fr', gap: 80, alignItems:'center' }}>
          <div>
            <Text v="overline" color={c.accentFg} style={{ opacity:0.7, marginBottom:16, display:'block' }}>اشتراك مجّال</Text>
            <h2 style={{ fontFamily: t.display, fontWeight:700, fontSize: 72, lineHeight:1, letterSpacing:'-0.02em', margin:0, color: c.accentFg }}>
              كل ما تحب من ثمانية.<br/>في مكان واحد.
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, marginTop: 24, color: c.accentFg, opacity: 0.85, maxWidth: 560 }}>
              استمتع بمحتوى حصري، وبودكاست بلا إعلانات، ومشاهدة غير محدودة — مقابل فنجان قهوة في الشهر.
            </p>
            <div style={{ display:'flex', gap:12, marginTop:32 }}>
              <Button variant="solid" size="lg" style={{ background:'#fff', color: c.accent }}>ابدأ تجربتك المجّانية</Button>
            </div>
          </div>
          <div>
            <div style={{ background:'rgba(0,0,0,0.15)', backdropFilter:'blur(10px)', borderRadius: r.xl, padding: 32, border:'1px solid rgba(255,255,255,0.2)' }}>
              {['مشاهدة غير محدودة', 'تحميل للمشاهدة دون إنترنت', 'بلا إعلانات. أبداً.', 'محتوى حصري من ثمانية', 'إلغاء في أي وقت'].map((f,i)=>(
                <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 0', borderBottom: i<4 ? '1px solid rgba(255,255,255,0.2)':'none' }}>
                  <Icon.Check size={18}/>
                  <Text v="body">{f}</Text>
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:20 }}>
                <span style={{ fontFamily: t.display, fontWeight:700, fontSize:56, lineHeight:1 }}>٢٩</span>
                <Text v="h5">ريال / شهرياً</Text>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:'64px 48px 32px', background: c.bg, borderTop:`1px solid ${c.border}` }}>
        <div style={{ maxWidth: 1280, margin:'0 auto', display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap: 48 }}>
          <div>
            <ThmanyahLogo size={28} color={c.fg}/>
            <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginTop:20, maxWidth: 320 }}>
              شركة إعلام عربية مستقلة تأسست عام ٢٠١٦. رسالتنا أن نروي ما لا يُروى.
            </Text>
          </div>
          {[
            { t:'المحتوى', items:['بودكاست','وثائقيات','رياضة','حوارات'] },
            { t:'الشركة', items:['من نحن','الوظائف','الصحافة','تواصل'] },
            { t:'قانوني', items:['الشروط','الخصوصية','ملفات الارتباط'] },
          ].map((col,i)=>(
            <div key={i}>
              <Text v="label" color={c.fg} style={{ display:'block', marginBottom:14 }}>{col.t}</Text>
              {col.items.map((it,j)=><Text key={j} v="bodySm" color={c.fgMuted} style={{ display:'block', padding:'6px 0', cursor:'pointer' }}>{it}</Text>)}
            </div>
          ))}
        </div>
        <div style={{ marginTop:48, paddingTop:24, borderTop:`1px solid ${c.border}`, display:'flex', justifyContent:'space-between' }}>
          <Text v="caption" color={c.fgSubtle}>© ٢٠٢٦ شركة ثمانية</Text>
          <Text v="caption" color={c.fgSubtle}>صُنع في الرياض</Text>
        </div>
      </footer>
    </div>
  );
}

window.SurfaceLanding = SurfaceLanding;
