/* global React, useTokens, Text, Icon, Button, IconButton, Toggle, Chip */

function TweaksPanel({ tweaks, setTweaks, visible, onClose }) {
  const tk = useTokens();
  const { c, r, t } = tk;
  if (!visible) return null;

  const update = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent?.postMessage({ type:'__edit_mode_set_keys', edits: { [k]: v }}, '*');
  };

  const Row = ({ label, children }) => (
    <div style={{ marginBottom: 18 }}>
      <Text v="overline" color={c.fgMuted} style={{ display:'block', marginBottom:8 }}>{label}</Text>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>{children}</div>
    </div>
  );

  return (
    <div style={{
      position:'fixed', bottom: 20, insetInlineEnd: 20, zIndex: 100,
      width: 320, background: c.bg, border:`1px solid ${c.border}`,
      borderRadius: r.lg, boxShadow:'0 24px 80px rgba(0,0,0,0.5)',
      padding: 20, direction:'rtl',
    }}>
      <div style={{ display:'flex', alignItems:'center', marginBottom: 16 }}>
        <Text v="label" color={c.fg}>Tweaks</Text>
        <IconButton icon={<Icon.Close/>} size="sm" style={{ marginInlineStart:'auto' }} onClick={onClose}/>
      </div>

      <Row label="الباليت">
        {['authentic','ember','gold'].map(p=>(
          <Chip key={p} selected={tweaks.palette===p} onClick={()=>update('palette', p)}>{window.PALETTES[p].nameAr}</Chip>
        ))}
      </Row>

      <Row label="الوضع">
        {[['dark','داكن'],['light','فاتح']].map(([v,l])=>(
          <Chip key={v} selected={tweaks.mode===v} onClick={()=>update('mode', v)}>{l}</Chip>
        ))}
      </Row>

      <Row label="الحواف">
        {[['sharp','حادّ'],['default','ناعم'],['pill','دائري']].map(([v,l])=>(
          <Chip key={v} selected={tweaks.radius===v} onClick={()=>update('radius', v)}>{l}</Chip>
        ))}
      </Row>

      <Row label="الكثافة">
        {[['compact','مُضغوط'],['comfortable','مُريح'],['spacious','واسع']].map(([v,l])=>(
          <Chip key={v} selected={tweaks.density===v} onClick={()=>update('density', v)}>{l}</Chip>
        ))}
      </Row>

      <Row label="الخطوط">
        {[['thmanyah','ثمانية'],['readex','Readex × Amiri'],['plex','Plex × Amiri']].map(([v,l])=>(
          <Chip key={v} selected={tweaks.typeScale===v} onClick={()=>update('typeScale', v)}>{l}</Chip>
        ))}
      </Row>
    </div>
  );
}

window.TweaksPanel = TweaksPanel;
