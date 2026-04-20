/* global React, useTokens, Button, Badge, Card, Text, Icon, ThmanyahLogo, DiamondGlyph, Stat, Divider, Avatar, Pullquote */

function SurfaceReport() {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <div style={{ background: c.bg, color: c.fg, minHeight:'100vh' }}>
      {/* Masthead */}
      <header style={{ padding:'32px 64px', borderBottom:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <ThmanyahLogo size={22} color={c.fg}/>
        <Text v="caption" color={c.fgMuted}>تقرير الأثر · ٢٠٢٥</Text>
      </header>

      <article style={{ maxWidth: 960, margin:'0 auto', padding:'80px 32px 120px' }}>
        {/* Article header */}
        <Badge variant="outline" size="md" style={{ marginBottom: 24 }}>قراءة · ١٢ دقيقة</Badge>
        <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize: 88, lineHeight:1, letterSpacing:'-0.03em', margin:0 }}>
          كيف يُعيد الصوت العربي<br/>تعريف <span style={{ color: c.accent }}>الذاكرة الجمعية</span>؟
        </h1>
        <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginTop: 32, lineHeight:1.5 }}>
          دراسة الأثر السنوية لثمانية — ملخّصٌ تنفيذي حول ما يستمع إليه ٢٤ مليون عربي كل شهر،
          ولماذا يهمّ ذلك أكثر من أي وقت مضى.
        </Text>
        <div style={{ display:'flex', alignItems:'center', gap: 16, marginTop: 40, paddingBottom: 40, borderBottom:`1px solid ${c.border}` }}>
          <Avatar name="فريق البحث"/>
          <div>
            <Text v="label" color={c.fg}>قسم البحوث — ثمانية</Text>
            <Text v="caption" color={c.fgMuted} style={{ display:'block' }}>منشور · ١٥ مارس ٢٠٢٦</Text>
          </div>
        </div>

        {/* Lede image */}
        <div style={{ width:'calc(100% + 240px)', marginInline:-120, height: 480, background:`url(assets/hero-3.png) center/cover`, borderRadius: r.lg, marginBlock: 56 }}/>

        {/* Body copy */}
        <p style={{ fontFamily:t.sans, fontSize: 20, lineHeight: 1.7, color: c.fg, marginBlockEnd: 24 }}>
          في ديسمبر ٢٠١٦، سجّل صديقان حلقةً واحدة من الاستوديو الصغير في حيّ الملقا — ولم يستمع إليها
          سوى ثلاثة أشخاص. بعد تسع سنوات، صارت <b>فنجان</b> أشهر بودكاست عربي على الإطلاق، وصارت ثمانية
          أكبر بيت محتوى مستقل من المحيط إلى الخليج.
        </p>
        <p style={{ fontFamily:t.sans, fontSize: 20, lineHeight: 1.7, color: c.fg, marginBlockEnd: 48 }}>
          هذا التقرير لا يتحدّث عن الأرقام فحسب. يتحدّث عن <i>ما</i> يحدث حين يصبح للمحتوى العربي
          صوتٌ واضح، وإيقاعٌ موسمي، وذاكرةٌ مُؤرشَفة.
        </p>

        {/* Pullquote */}
        <Pullquote attribution="عبدالرحمن أبومالح · المؤسس المشارك">
          الصوت ليس وسيطاً فقط — بل هو الطريقة الأقدم التي يَتذكّر بها العرب أنفسَهم.
        </Pullquote>

        {/* Stats strip */}
        <div style={{ marginBlock: 56 }}>
          <Text v="overline" color={c.accent} style={{ display:'block', marginBottom:32 }}>عام ٢٠٢٥ بالأرقام</Text>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 48 }}>
            <Stat value="٢٤M" label="مستمع ومشاهد شهرياً" trend="+٣٠٪ سنوياً"/>
            <Stat value="٤.٨" unit="ساعة" label="متوسط الاستماع الشهري" trend="أعلى في الخليج"/>
            <Stat value="٩٣٪" label="نسبة إكمال الحلقات" trend="فوق المعيار العالمي"/>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <h2 style={{ fontFamily:t.display, fontWeight:700, fontSize: 48, lineHeight:1.1, letterSpacing:'-0.02em', marginBlock:'56px 24px' }}>
          الفرق بين سمعَ وأنصتَ.
        </h2>
        <p style={{ fontFamily:t.sans, fontSize: 18, lineHeight: 1.7, color: c.fgMuted, marginBlockEnd: 32 }}>
          درسنا ما يَحدث في دماغ المستمع لحظة الإنصات العميق — وقارنّا ذلك بعادات الاستماع العابرة.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 1, background: c.border, borderRadius: r.lg, overflow:'hidden' }}>
          {[
            { t:'الاستماع العابر', p:'خلفية، مقاطع قصيرة، تنقّل بين القنوات.', n:['٣٢٪ نسبة الإكمال','٤٠ ثانية متوسط الإنصات','احتفاظ ذاكري ١٨٪'], accent:false },
            { t:'الإنصات العميق', p:'جلسة مُختارة، حلقة كاملة، بيئة هادئة.', n:['٩٣٪ نسبة الإكمال','٤٨ دقيقة متوسط الإنصات','احتفاظ ذاكري ٧٤٪'], accent:true },
          ].map((col,j)=>(
            <div key={j} style={{ background: col.accent?c.accent:c.surface, color: col.accent?c.accentFg:c.fg, padding: 32 }}>
              <Text v="h5" color={col.accent?c.accentFg:c.fg} style={{ display:'block', marginBottom: 6 }}>{col.t}</Text>
              <Text v="bodySm" color={col.accent?c.accentFg:c.fgMuted} style={{ opacity: col.accent?0.85:1, display:'block', marginBottom:20 }}>{col.p}</Text>
              {col.n.map((x,k)=>(
                <div key={k} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 0', borderTop: k>0?`1px solid ${col.accent?'rgba(255,255,255,0.2)':c.border}`:'none' }}>
                  <Icon.Check size={16}/><Text v="bodySm">{x}</Text>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Closing */}
        <h2 style={{ fontFamily:t.display, fontWeight:700, fontSize: 48, lineHeight:1.1, letterSpacing:'-0.02em', marginBlock:'80px 24px' }}>
          ماذا بعد؟
        </h2>
        <p style={{ fontFamily:t.sans, fontSize: 20, lineHeight: 1.7, color: c.fg }}>
          نكتب الآن الفصل القادم: أفلام وثائقية طويلة، ومسلسلات درامية صوتية، وأوّل جائزة عربية للمحتوى الصوتي.
          انضمّ إلينا على <span style={{ color: c.accent }}>thmanyah.com/mjal</span>.
        </p>
      </article>
    </div>
  );
}

window.SurfaceReport = SurfaceReport;
