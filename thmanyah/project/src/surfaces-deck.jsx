/* global React, useTokens, Button, Badge, Card, Text, Icon, ThmanyahLogo, DiamondGlyph, KPI, Stat, Pullquote, Avatar, Divider, TimelineRow */

function SurfaceDeck() {
  const tk = useTokens(); const { c, r, t } = tk;
  const [i, setI] = React.useState(0);

  const slides = [
    // 0 — cover
    () => (
      <div style={{ position:'relative', width:'100%', height:'100%', background: c.bg, padding: 80, display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}>
        <div style={{ position:'absolute', insetInlineEnd:-140, top:-60, opacity:0.1 }}><DiamondGlyph size={720} color={c.accent}/></div>
        <div style={{ position:'relative' }}><ThmanyahLogo size={32} color={c.fg}/></div>
        <div style={{ position:'relative' }}>
          <Text v="overline" color={c.accent} style={{ display:'block', marginBottom: 24 }}>تقرير الاستراتيجية · ربع أول ٢٠٢٦</Text>
          <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize:144, lineHeight:0.92, letterSpacing:'-0.03em', margin:0 }}>
            حكاية<br/>ثمانية.
          </h1>
          <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginTop:32, maxWidth:540 }}>
            من حلقة بودكاست واحدة إلى منصة محتوى تصل ٢٤ مليون مستمع شهرياً.
          </Text>
        </div>
        <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <Text v="caption" color={c.fgSubtle}>الرياض · ٢٠٢٦</Text>
          <Text v="caption" color={c.fgSubtle}>0١</Text>
        </div>
      </div>
    ),

    // 1 — big stat
    () => (
      <div style={{ width:'100%', height:'100%', background: c.accent, color: c.accentFg, padding: 96, display:'flex', flexDirection:'column', justifyContent:'center', position:'relative' }}>
        <Text v="overline" color={c.accentFg} style={{ opacity:0.7, marginBottom: 24, display:'block' }}>الرقم الذي يحرّكنا</Text>
        <span style={{ fontFamily:t.display, fontWeight:700, fontSize: 360, lineHeight:0.9, letterSpacing:'-0.04em' }}>٢٤M</span>
        <Text v="h2" color={c.accentFg} style={{ marginTop: 24, maxWidth: 720, display:'block' }}>
          مستمع ومشاهد شهرياً — نمونا أربعة أضعاف في ثمانية عشر شهراً.
        </Text>
        <div style={{ position:'absolute', insetInlineEnd:80, top:96, textAlign:'end' }}>
          <ThmanyahLogo size={24} color={c.accentFg}/>
          <Text v="caption" color={c.accentFg} style={{ opacity:0.7, marginTop:4, display:'block' }}>٠٢ / ٠٦</Text>
        </div>
      </div>
    ),

    // 2 — data grid
    () => (
      <div style={{ width:'100%', height:'100%', background: c.bg, padding: 80 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 48 }}>
          <div>
            <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:8 }}>٢٠٢٥ في أرقام</Text>
            <h2 style={{ fontFamily:t.display, fontWeight:700, fontSize:64, lineHeight:1, letterSpacing:'-0.02em', margin:0 }}>عام الأرقام القياسية.</h2>
          </div>
          <Text v="caption" color={c.fgSubtle}>٠٣ / ٠٦</Text>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 1, background: c.border }}>
          {[
            { v:'٨٠٠+', l:'حلقة وثائقية وبودكاست', s:'+٢٤٠ مقارنة بـ ٢٠٢٤' },
            { v:'٤.٨', l:'متوسط ساعات الاستماع شهرياً', s:'أعلى في الخليج' },
            { v:'٩٣٪', l:'معدّل إكمال الحلقات', s:'فوق المعيار العالمي' },
            { v:'١٢', l:'لهجة عربية ممثّلة', s:'من المغرب إلى عُمان' },
            { v:'٤٥', l:'جائزة ومنصة احتفاء', s:'٨ منها دولية' },
            { v:'١٢٠M', l:'ريال إيرادات ٢٠٢٥', s:'+٦٨٪ على الأساس السنوي' },
          ].map((k,j)=>(
            <div key={j} style={{ background: c.bg, padding: 32 }}>
              <span style={{ fontFamily:t.display, fontWeight:700, fontSize: 96, lineHeight:1, letterSpacing:'-0.03em', color: c.fg }}>{k.v}</span>
              <Text v="label" color={c.fg} style={{ display:'block', marginTop:12 }}>{k.l}</Text>
              <Text v="caption" color={c.success} style={{ display:'block', marginTop:4 }}>{k.s}</Text>
            </div>
          ))}
        </div>
      </div>
    ),

    // 3 — pullquote
    () => (
      <div style={{ width:'100%', height:'100%', background: c.surface, padding: 120, display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <Icon.Quote size={72} style={{ color: c.accent, marginBottom: 32 }}/>
        <p style={{ fontFamily:t.display, fontWeight:700, fontSize: 88, lineHeight:1.1, letterSpacing:'-0.02em', margin:0, color: c.fg, maxWidth:1100 }}>
          "ثمانية لا تَصنع برامج. <span style={{ color: c.accent }}>تَصنع ذاكرة</span> لأجيال لم تكن تَعلم أنها تحتاجها."
        </p>
        <div style={{ marginTop: 64, display:'flex', alignItems:'center', gap:16 }}>
          <Avatar name="صحيفة الشرق"/>
          <div>
            <Text v="label" color={c.fg}>مُراجعة الشرق الأوسط</Text>
            <Text v="caption" color={c.fgMuted} style={{ display:'block' }}>مارس ٢٠٢٦</Text>
          </div>
        </div>
      </div>
    ),

    // 4 — timeline
    () => (
      <div style={{ width:'100%', height:'100%', background: c.bg, padding: 80, display:'grid', gridTemplateColumns:'1fr 1.4fr', gap: 80 }}>
        <div>
          <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:16 }}>الرحلة</Text>
          <h2 style={{ fontFamily:t.display, fontWeight:700, fontSize: 72, lineHeight:1, letterSpacing:'-0.02em', margin:0 }}>
            عشر سنوات.<br/>عشرة فصول.
          </h2>
          <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginTop:24 }}>
            من فنجان قهوة بين صديقين إلى منصة إعلامية تضمّ ٢٣٠ موظفاً.
          </Text>
        </div>
        <div>
          {[
            { time:'٢٠١٦', title:'أول حلقة "فنجان"', description:'تُسجَّل في غرفة النوم — ٣ مستمعين في الشهر الأول.' },
            { time:'٢٠١٩', title:'إطلاق استوديو الإنتاج', description:'٥ برامج، ٢٠ موظف، أول حلقة تتجاوز مليون استماع.' },
            { time:'٢٠٢٢', title:'ثمانية وثائقي', description:'أول فيلم وثائقي — "ذاكرة البحر" — يربح جائزتين.' },
            { time:'٢٠٢٤', title:'منصة مجّال', description:'أكبر منصة محتوى صوتي وبصري عربية مستقلة.' },
            { time:'٢٠٢٦', title:'الآن', description:'ننظر نحو الأفلام الطويلة والمسلسلات الدرامية.', last:true },
          ].map((e,j)=><TimelineRow key={j} {...e}/>)}
        </div>
      </div>
    ),

    // 5 — closing
    () => (
      <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg, ${c.bg} 0%, ${c.ink700||c.surfaceElev} 100%)`, padding: 120, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <DiamondGlyph size={220} color={c.accent} style={{ marginBottom: 48 }}/>
        <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize: 160, lineHeight:0.9, letterSpacing:'-0.03em', margin:0 }}>
          شكراً.
        </h1>
        <Text v="h3" color={c.fgMuted} style={{ marginTop:32, maxWidth: 720 }}>
          نَروي ما لا يُروى. بصوت عربي واضح.
        </Text>
        <Text v="caption" color={c.fgSubtle} style={{ marginTop: 64 }}>thmanyah.com · @thmanyah</Text>
      </div>
    ),
  ];

  return (
    <div style={{ background: c.surfaceSunken, minHeight:'100vh', padding: 32, display:'flex', flexDirection:'column', alignItems:'center', gap: 24 }}>
      {/* Nav */}
      <div style={{ display:'flex', alignItems:'center', gap:12, background:c.surfaceElev, padding:'8px 12px', borderRadius: r.full }}>
        <Button variant="ghost" size="sm" icon={<Icon.ChevR/>} onClick={()=>setI(Math.max(0, i-1))}>السابق</Button>
        <Text v="caption" color={c.fgMuted}>{String(i+1).padStart(2,'٠')} / {String(slides.length).padStart(2,'٠')}</Text>
        <Button variant="ghost" size="sm" iconEnd={<Icon.ChevL/>} onClick={()=>setI(Math.min(slides.length-1, i+1))}>التالي</Button>
      </div>

      {/* Slide frame — 16:9 */}
      <div style={{ width: '100%', maxWidth: 1600, aspectRatio:'16/9', borderRadius: r.xl, overflow:'hidden', boxShadow:'0 30px 80px rgba(0,0,0,0.35)', border:`1px solid ${c.border}`, background:c.bg }}>
        {slides[i]()}
      </div>

      {/* Thumbs */}
      <div style={{ display:'flex', gap:10 }}>
        {slides.map((_, j)=>(
          <button key={j} onClick={()=>setI(j)} style={{
            width: j===i?32:10, height:10, borderRadius: r.full,
            background: j===i ? c.accent : c.border, border:'none', cursor:'pointer', transition:'all 200ms',
          }}/>
        ))}
      </div>
    </div>
  );
}

window.SurfaceDeck = SurfaceDeck;
