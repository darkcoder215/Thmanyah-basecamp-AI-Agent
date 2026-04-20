/* global React, useTokens, Button, IconButton, Badge, Card, Text, Icon, Progress, ThmanyahLogo, DiamondGlyph, Avatar */

function SurfacePlayer() {
  const tk = useTokens(); const { c, r, t } = tk;
  return (
    <div style={{ background: c.bg, color: c.fg, minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 380px' }}>
      {/* Video stage */}
      <div style={{ display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 32px', borderBottom:`1px solid ${c.border}` }}>
          <IconButton icon={<Icon.ChevR/>} variant="bordered" size="sm"/>
          <Text v="bodySm" color={c.fgMuted}>المكتبة / وثائقي / </Text>
          <Text v="bodySm" color={c.fg}>عاصفة في الجزيرة العربية</Text>
          <div style={{ marginInlineStart:'auto', display:'flex', gap:8 }}>
            <IconButton icon={<Icon.Share/>} variant="ghost" size="sm"/>
            <IconButton icon={<Icon.Download/>} variant="ghost" size="sm"/>
            <IconButton icon={<Icon.More/>} variant="ghost" size="sm"/>
          </div>
        </div>

        {/* Stage */}
        <div style={{ flex:1, padding: 32, display:'flex', flexDirection:'column', gap: 24 }}>
          <div style={{
            position:'relative',
            aspectRatio:'16/9', width:'100%',
            borderRadius: r.xl, overflow:'hidden',
            background:`url(assets/hero-3.png) center/cover`,
          }}>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.1))' }}>
              <div style={{ width:96, height:96, borderRadius:'50%', background:c.accent, display:'flex', alignItems:'center', justifyContent:'center', color:c.accentFg, boxShadow:'0 12px 40px rgba(0,0,0,0.5)' }}>
                <Icon.Play size={40}/>
              </div>
            </div>
            <div style={{ position:'absolute', top:16, insetInlineStart:16 }}>
              <Badge variant="glass" size="md">4K · Dolby</Badge>
            </div>
          </div>

          {/* Controls */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap: 14, marginBottom: 8 }}>
              <Text v="caption" color={c.fgMuted}>٢٤:١٠</Text>
              <Progress value={38} style={{ flex:1 }} height={4}/>
              <Text v="caption" color={c.fgMuted}>١:٠٤:٠٠</Text>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
              <IconButton icon={<Icon.Skip15/>} variant="ghost"/>
              <IconButton icon={<Icon.Play/>} variant="solid" size="lg"/>
              <IconButton icon={<Icon.Skip15/>} variant="ghost" style={{ transform:'scaleX(-1)' }}/>
              <IconButton icon={<Icon.Volume/>} variant="ghost"/>
              <div style={{ marginInlineStart:'auto', display:'flex', gap:8 }}>
                <IconButton icon={<Icon.Cast/>} variant="ghost"/>
                <IconButton icon={<Icon.Fullscr/>} variant="ghost"/>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <Badge variant="accent">وثائقي</Badge>
              <Badge variant="outline">٢٠٢٦</Badge>
              <Badge variant="outline">عربي</Badge>
              <Badge variant="outline">+١٢</Badge>
            </div>
            <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize: 56, lineHeight:1.05, letterSpacing:'-0.02em', margin:0 }}>
              عاصفة في الجزيرة العربية
            </h1>
            <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginTop: 16, maxWidth: 720, lineHeight:1.6 }}>
              رحلة استكشافية عبر أعظم العواصف الرملية التي عرفتها شبه الجزيرة، وكيف شكّلت هويّتها وأهلها عبر قرون.
              مع شهادات من بدوٍ عاصروا آخر العواصف الكبرى.
            </Text>
            <div style={{ display:'flex', alignItems:'center', gap:16, marginTop: 24 }}>
              <Avatar name="محمد العتيبي"/>
              <div>
                <Text v="label" color={c.fg}>إخراج محمد العتيبي</Text>
                <Text v="caption" color={c.fgMuted} style={{ display:'block' }}>إنتاج ثمانية · ٢٠٢٦</Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel: queue */}
      <aside style={{ borderInlineEnd:`1px solid ${c.border}`, background: c.surface, padding: 24, overflow:'auto' }}>
        <Text v="h5" color={c.fg} style={{ display:'block', marginBottom: 4 }}>حلقات المسلسل</Text>
        <Text v="caption" color={c.fgMuted} style={{ display:'block', marginBottom: 20 }}>الموسم الأول · ٨ حلقات</Text>
        {[
          { n:'١', t:'البداية — رياح الربع الخالي', d:'٥٤:٢٠', playing:true },
          { n:'٢', t:'العمود الترابي', d:'٥٨:١٠' },
          { n:'٣', t:'ذاكرة البدو', d:'١:٠٤:٠٠' },
          { n:'٤', t:'عام الطفحة', d:'٥٢:٠٥' },
          { n:'٥', t:'هبوب الدهناء', d:'٥٦:٣٠' },
          { n:'٦', t:'ما بعد العاصفة', d:'١:٠٨:٠٠' },
        ].map((ep,i)=>(
          <div key={i} style={{
            display:'flex', gap:12, padding:14, marginBottom: 6,
            borderRadius: r.md,
            background: ep.playing ? c.surfaceElev : 'transparent',
            border: ep.playing ? `1px solid ${c.accent}`:'1px solid transparent',
            cursor:'pointer',
          }}>
            <div style={{ fontFamily:t.display, fontSize:28, fontWeight:700, color: ep.playing?c.accent:c.fgSubtle, minWidth:32 }}>{ep.n}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <Text v="label" color={ep.playing?c.fg:c.fgMuted} style={{ display:'block' }}>{ep.t}</Text>
              <Text v="caption" color={c.fgSubtle}>{ep.d}</Text>
            </div>
            {ep.playing && <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:20 }}>
              {[10,16,8,14].map((h,j)=><div key={j} style={{ width:2, height:h, background:c.accent, animation:`bars 800ms ${j*100}ms infinite alternate` }}/>)}
            </div>}
          </div>
        ))}
        <style>{`@keyframes bars { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>
      </aside>
    </div>
  );
}

window.SurfacePlayer = SurfacePlayer;
