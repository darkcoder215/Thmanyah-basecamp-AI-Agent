/* global React, useTokens, Button, IconButton, Badge, Chip, SearchField, Card, MediaCard, PosterCard, ListItem, SectionTitle, SidebarItem, Text, Icon, ThmanyahLogo, Tabs, Avatar, Tag, Progress */

function SurfaceApp() {
  const tk = useTokens(); const { c, r, t } = tk;
  const [nav, setNav] = React.useState('home');
  const [tab, setTab] = React.useState('all');

  return (
    <div style={{ background: c.bg, color: c.fg, display:'grid', gridTemplateColumns:'260px 1fr', minHeight:'100vh' }}>
      {/* Sidebar */}
      <aside style={{ borderInlineStart:`1px solid ${c.border}`, padding:'24px 16px', position:'sticky', top:0, height:'100vh', overflow:'auto' }}>
        <div style={{ padding:'4px 10px 24px' }}>
          <ThmanyahLogo size={22} color={c.fg}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {[
            { id:'home', l:'الرئيسية', i:<Icon.Home/> },
            { id:'lib', l:'المكتبة', i:<Icon.Library/> },
            { id:'pods', l:'البودكاست', i:<Icon.Mic/> },
            { id:'live', l:'البث المباشر', i:<Icon.Live/>, count:'٣' },
            { id:'fav', l:'المفضّلة', i:<Icon.Heart/> },
            { id:'hist', l:'المُشاهد لاحقاً', i:<Icon.Clock/>, count:'١٢' },
          ].map(it=><SidebarItem key={it.id} {...it} icon={it.i} label={it.l} active={nav===it.id} onClick={()=>setNav(it.id)}/>)}
        </div>
        <div style={{ padding:'24px 10px 8px' }}>
          <Text v="overline" color={c.fgSubtle}>متابعاتك</Text>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {['فنجان','ثمانية','أشياء غيّرتنا','بودكاست بلاي'].map(l=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius: r.md, cursor:'pointer' }}>
              <div style={{ width:28, height:28, borderRadius: r.sm, background: c.surfaceElev }}/>
              <Text v="bodySm" color={c.fgMuted}>{l}</Text>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main>
        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 32px', borderBottom:`1px solid ${c.border}`, position:'sticky', top:0, background: c.bg, zIndex: 5 }}>
          <IconButton icon={<Icon.ChevR/>} variant="bordered" size="sm"/>
          <IconButton icon={<Icon.ChevL/>} variant="bordered" size="sm"/>
          <SearchField placeholder="ابحث عن برامج، حلقات، ضيوف..." block/>
          <div style={{ marginInlineStart:'auto', display:'flex', gap:10, alignItems:'center' }}>
            <IconButton icon={<Icon.Bell/>} variant="ghost"/>
            <Avatar name="أحمد" size={36}/>
          </div>
        </div>

        <div style={{ padding:'32px' }}>
          {/* Hero spotlight */}
          <div style={{
            position:'relative',
            height: 360, borderRadius: r.xl, overflow:'hidden',
            background:`linear-gradient(90deg, ${c.bg}EE 10%, transparent 70%), url(assets/hero-2.png) center/cover`,
            padding: 48, display:'flex', flexDirection:'column', justifyContent:'flex-end',
            marginBottom: 40,
          }}>
            <Badge variant="live" icon={<Icon.Live size={8}/>} style={{ alignSelf:'flex-start', marginBottom: 12 }}>مباشر الآن</Badge>
            <h1 style={{ fontFamily:t.display, fontWeight:700, fontSize: 56, lineHeight:1.05, letterSpacing:'-0.02em', margin:0, maxWidth: 640 }}>
              فنجان مع عبدالرحمن أبومالح
            </h1>
            <Text v="bodyLg" color={c.fgMuted} style={{ display:'block', marginTop: 12, maxWidth: 560 }}>
              حلقة خاصة مع د. محمد العيسى — الحوار الذي يُغيّر نظرتك للعالم.
            </Text>
            <div style={{ display:'flex', gap:10, marginTop: 24 }}>
              <Button variant="primary" size="md" icon={<Icon.Play/>}>مشاهدة الآن</Button>
              <Button variant="ghost" size="md" icon={<Icon.Plus/>}>إلى المكتبة</Button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ marginBottom: 24 }}>
            <Tabs variant="pills" value={tab} onChange={setTab} items={[
              { id:'all', label:'الكل' },
              { id:'pod', label:'بودكاست' },
              { id:'doc', label:'وثائقي' },
              { id:'live', label:'مباشر' },
              { id:'sport', label:'رياضة' },
            ]}/>
          </div>

          <SectionTitle title="يُوصى لك" subtitle="بناءً على مشاهداتك الأخيرة" action={<Button variant="link" size="sm">عرض الكل</Button>}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 20, marginBottom: 48 }}>
            {[
              { img:'assets/show-3.png', t:'أشياء غيّرتنا', m:'موسم ٤ · جديد', d:'٤٢:١٥' },
              { img:'assets/show-4.png', t:'صوتك عالي', m:'حوار أسبوعي', d:'٥٨:٠٠' },
              { img:'assets/show-5.png', t:'بودكاست بلاي', m:'رياضة · حي', live:true },
              { img:'assets/show-6.png', t:'ثمانية تحقيقات', m:'وثائقي', d:'١:٢٠:٠٠' },
            ].map((it,i)=><MediaCard key={i} image={it.img} title={it.t} meta={it.m} duration={it.d} live={it.live} size="md"/>)}
          </div>

          <SectionTitle title="تابع الاستماع" action={<Button variant="link" size="sm">عرض الكل</Button>}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, marginBottom: 48 }}>
            {[
              { img:'assets/show-7.png', t:'الحلقة ١٢١ · القيادة في زمن الذكاء', s:'فنجان', p: 62, d:'٤٨:٢٢' },
              { img:'assets/show-8.png', t:'عاصفة في الجزيرة العربية', s:'وثائقي ثمانية', p: 24, d:'١:٠٤:٠٠' },
            ].map((it,i)=>(
              <Card key={i} variant="flat" padding={16} style={{ display:'flex', gap:16, alignItems:'center' }}>
                <div style={{ width: 96, height: 96, borderRadius: r.md, background:`url(${it.img}) center/cover`, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <Text v="caption" color={c.accent}>{it.s}</Text>
                  <Text v="h5" color={c.fg} style={{ display:'block', marginTop:4 }}>{it.t}</Text>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginTop: 10 }}>
                    <Progress value={it.p} style={{ flex:1 }}/>
                    <Text v="caption" color={c.fgMuted}>{it.d}</Text>
                  </div>
                </div>
                <IconButton icon={<Icon.Play/>} variant="accent" size="lg"/>
              </Card>
            ))}
          </div>

          <SectionTitle title="برامج تستحق المتابعة"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 16 }}>
            {['assets/show-1.png','assets/show-2.png','assets/show-3.png','assets/show-4.png','assets/show-5.png','assets/show-6.png'].map((im,i)=>(
              <PosterCard key={i} image={im} title={['فنجان','ثمانية','أشياء','صوتك','بلاي','تحقيقات'][i]} category="بودكاست" size="sm"/>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

window.SurfaceApp = SurfaceApp;
