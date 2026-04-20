/* global React, useTokens, Button, Text, Icon, ThmanyahLogo, DiamondGlyph, Badge, Divider */

function SurfaceEmail() {
  const tk = useTokens(); const { c, r, t } = tk;
  const Email = ({ children }) => (
    <div style={{ width: 600, background: c.surface, border:`1px solid ${c.border}`, borderRadius: r.lg, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>{children}</div>
  );

  return (
    <div style={{ background: c.surfaceSunken, minHeight:'100vh', padding: 48, display:'flex', gap: 32, flexWrap:'wrap' }}>
      {/* Welcome email */}
      <Email>
        <div style={{ background: c.bg, padding: '32px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${c.border}` }}>
          <ThmanyahLogo size={20} color={c.fg}/>
          <Text v="caption" color={c.fgMuted}>النشرة الأسبوعية</Text>
        </div>

        <div style={{ padding: 40, background: c.surface }}>
          <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:8 }}>أهلاً بك في مجّال</Text>
          <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize:48, lineHeight:1.05, letterSpacing:'-0.02em', margin:0, color:c.fg }}>
            نبدأ من هُنا.
          </h1>
          <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginTop:16 }}>
            كل خميس، نرسل لك أبرز ما أنتجناه في ثمانية هذا الأسبوع — بودكاست، وثائقيات، وحوارات مُختارة.
          </Text>
          <div style={{ marginTop: 24 }}>
            <Button variant="primary" size="md">اِبدأ المشاهدة</Button>
          </div>
        </div>

        {/* Featured block */}
        <div style={{ padding:'0 40px 24px', background: c.surface }}>
          <Divider/>
          <div style={{ marginTop: 24 }}>
            <Text v="overline" color={c.fgMuted} style={{ display:'block', marginBottom: 16 }}>مختار الأسبوع</Text>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ width: 120, height: 120, borderRadius: r.md, background:`url(assets/show-3.png) center/cover`, flexShrink:0 }}/>
              <div>
                <Text v="caption" color={c.accent}>وثائقي · جديد</Text>
                <Text v="h5" color={c.fg} style={{ display:'block', marginTop:4 }}>أشياء غيّرتنا · الموسم الرابع</Text>
                <Text v="bodySm" color={c.fgMuted} style={{ display:'block', marginTop:6 }}>رحلة عبر الاكتشافات التي شكّلت الحياة اليومية في الخليج — ٨ حلقات جديدة.</Text>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ padding:'0 40px 40px', background: c.surface }}>
          <Divider/>
          <Text v="overline" color={c.fgMuted} style={{ display:'block', marginTop: 24, marginBottom:12 }}>ثلاث حلقات تستحق</Text>
          {[
            { n:'١', t:'فنجان #٣٢١ — القيادة في زمن الذكاء', d:'٤٨:٢٢' },
            { n:'٢', t:'صوتك عالي — الهويّة في العصر الرقمي', d:'٥٨:٠٠' },
            { n:'٣', t:'ثمانية تحقيقات — مياه الرياض المفقودة', d:'١:٢٠:٠٠' },
          ].map((e,i)=>(
            <div key={i} style={{ display:'flex', gap:16, alignItems:'center', padding:'14px 0', borderTop: i>0?`1px solid ${c.border}`:'none' }}>
              <span style={{ fontFamily:t.display, fontSize:36, fontWeight:700, color: c.accent, minWidth: 36, lineHeight:1 }}>{e.n}</span>
              <div style={{ flex:1 }}>
                <Text v="label" color={c.fg} style={{ display:'block' }}>{e.t}</Text>
                <Text v="caption" color={c.fgMuted}>{e.d}</Text>
              </div>
              <Icon.ArrowL size={16} style={{ color: c.fgMuted }}/>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'24px 40px', background: c.surfaceElev, textAlign:'center', borderTop:`1px solid ${c.border}` }}>
          <DiamondGlyph size={24} color={c.accent} style={{ marginBottom:12 }}/>
          <Text v="caption" color={c.fgMuted} style={{ display:'block' }}>© ٢٠٢٦ ثمانية · لإلغاء الاشتراك اضغط هنا</Text>
        </div>
      </Email>

      {/* Transactional email */}
      <Email>
        <div style={{ background: c.accent, color: c.accentFg, padding: 40, textAlign:'center' }}>
          <ThmanyahLogo size={22} color={c.accentFg} style={{ marginBottom: 32 }}/>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.2)', marginBottom: 24 }}>
            <Icon.Check size={36}/>
          </div>
          <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize: 40, lineHeight:1.05, margin:0, color:c.accentFg }}>
            اشتراكك مُفعّل.
          </h1>
          <Text v="bodyLg" color={c.accentFg} style={{ display:'block', marginTop:12, opacity:0.85 }}>
            أهلاً بك في عائلة مجّال.
          </Text>
        </div>
        <div style={{ padding: 40, background: c.surface }}>
          <Text v="body" color={c.fg} style={{ display:'block', marginBottom: 24, lineHeight:1.7 }}>
            مرحباً أحمد،<br/><br/>
            تأكّد إتمام اشتراكك الشهري في منصة مجّال. بدءاً من الآن يمكنك مشاهدة كامل الكتالوج بلا إعلانات.
          </Text>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 1, background: c.border, borderRadius: r.md, overflow:'hidden', marginBottom: 24 }}>
            {[
              { k:'الخطة', v:'مجّال شهري' },
              { k:'المبلغ', v:'٢٩.٠٠ ر.س' },
              { k:'التجديد', v:'١٥ أبريل' },
              { k:'رقم العملية', v:'TH-0284719' },
            ].map((x,i)=>(
              <div key={i} style={{ background: c.surfaceElev, padding:16 }}>
                <Text v="caption" color={c.fgMuted} style={{ display:'block' }}>{x.k}</Text>
                <Text v="label" color={c.fg} style={{ display:'block', marginTop:2 }}>{x.v}</Text>
              </div>
            ))}
          </div>
          <Button variant="primary" size="md" block>افتح التطبيق</Button>
        </div>
        <div style={{ padding:'20px 40px', background: c.bg, textAlign:'center', borderTop:`1px solid ${c.border}` }}>
          <Text v="caption" color={c.fgSubtle}>بحاجة لمساعدة؟ <span style={{ color: c.accent }}>تواصل معنا</span></Text>
        </div>
      </Email>
    </div>
  );
}

window.SurfaceEmail = SurfaceEmail;
