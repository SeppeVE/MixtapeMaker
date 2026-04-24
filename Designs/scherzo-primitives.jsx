// Scherzo-Mixtape primitives — reusable building blocks for the muted-neon,
// punched-plastic 90s-desktop aesthetic. All components prefixed Sch* so they
// don't collide with DesignCanvas's DC* components.

const SchTokens = {
  // "Muted Neon" palette — dusty/plastic, never pure primaries
  sage:     '#A8C4A2',
  seafoam:  '#8FC9B7',
  forest:   '#3D5A47',
  plum:     '#5B2838',
  mustard:  '#D4A935',
  lavender: '#B4A0C7',
  paper:    '#EFE8D6',
  paperDk:  '#DDD2B8',
  ink:      '#2A1E28',      // near-black with plum undertone for shadows/borders
  inkSoft:  '#4A3A48',
  white:    '#FAF6EB',      // warmed off-white
  // shadow = hard 45deg offset, no blur
  shadow:   '4px 4px 0 #2A1E28',
  shadowSm: '2px 2px 0 #2A1E28',
  shadowLg: '6px 6px 0 #2A1E28',
  // bevel = 1px white top-left inset + 1px dark bottom-right inset
  bevelOut: 'inset 1px 1px 0 rgba(255,255,255,.7), inset -1px -1px 0 rgba(0,0,0,.35)',
  bevelIn:  'inset -1px -1px 0 rgba(255,255,255,.5), inset 1px 1px 0 rgba(0,0,0,.35)',
};

// Font stacks — bitmap display for headers/chrome, readable body for content
const SchFonts = {
  pixel:  '"VT323", "Silkscreen", "Monaco", "Courier New", monospace',
  chrome: '"Geneva", "Chicago", "Verdana", system-ui, sans-serif',
  body:   '"Geneva", "Verdana", system-ui, sans-serif',
};

// Inject global styles once
if (typeof document !== 'undefined' && !document.getElementById('sch-styles')) {
  // Pixel font via Google
  if (!document.querySelector('link[href*="VT323"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Silkscreen:wght@400;700&display=swap';
    document.head.appendChild(l);
  }
  const s = document.createElement('style');
  s.id = 'sch-styles';
  s.textContent = `
    .sch-btn{font-family:${SchFonts.chrome};font-weight:700;font-size:13px;
      padding:7px 14px;background:${SchTokens.paper};color:${SchTokens.ink};
      border:2px solid ${SchTokens.ink};box-shadow:${SchTokens.shadowSm};
      cursor:pointer;letter-spacing:.2px;transition:transform .06s,box-shadow .06s;
      display:inline-flex;align-items:center;gap:6px;line-height:1;user-select:none}
    .sch-btn:hover{background:${SchTokens.mustard}}
    .sch-btn:active{transform:translate(2px,2px);box-shadow:none}
    .sch-btn.primary{background:${SchTokens.plum};color:${SchTokens.paper}}
    .sch-btn.primary:hover{background:${SchTokens.mustard};color:${SchTokens.ink}}
    .sch-input{font-family:${SchFonts.chrome};font-size:13px;
      padding:7px 10px;background:${SchTokens.white};color:${SchTokens.ink};
      border:2px solid ${SchTokens.ink};box-shadow:${SchTokens.bevelIn};
      outline:none;width:100%;box-sizing:border-box}
    .sch-input:focus{background:${SchTokens.mustard}22}
    .sch-pixel{font-family:${SchFonts.pixel};letter-spacing:.5px}
    .sch-chrome{font-family:${SchFonts.chrome}}
    @keyframes sch-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
    .sch-cursor::after{content:'_';animation:sch-blink 1s step-end infinite;margin-left:2px}
    @keyframes sch-tape-spin{to{transform:rotate(360deg)}}
    .sch-tape-wheel{animation:sch-tape-spin 2s linear infinite}
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────
// SchDither — checkerboard SVG pattern between two colors.
// Use as a background via fill="url(#id)" or as inline style.
// ─────────────────────────────────────────────────────────────
function SchDitherPattern({ id, c1, c2, size = 2 }) {
  return (
    <pattern id={id} width={size * 2} height={size * 2} patternUnits="userSpaceOnUse">
      <rect width={size * 2} height={size * 2} fill={c1} />
      <rect x={0} y={0} width={size} height={size} fill={c2} />
      <rect x={size} y={size} width={size} height={size} fill={c2} />
    </pattern>
  );
}

// CSS-friendly dither: returns a data URL background-image
function schDitherUrl(c1, c2, size = 2) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size * 2}' height='${size * 2}'><rect width='${size * 2}' height='${size * 2}' fill='${c1}'/><rect width='${size}' height='${size}' fill='${c2}'/><rect x='${size}' y='${size}' width='${size}' height='${size}' fill='${c2}'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// ─────────────────────────────────────────────────────────────
// SchWindow — classic "punched plastic" window frame.
// Props: title, titleColor, bg, width, children, titleRight (extra nodes).
// ─────────────────────────────────────────────────────────────
function SchWindow({ title, titleColor = SchTokens.plum, titleFg = SchTokens.paper,
                    bg = SchTokens.sage, style = {}, children, titleRight, icon,
                    noPad = false, shadow = SchTokens.shadow, onClose }) {
  return (
    <div style={{
      background: bg, border: `2px solid ${SchTokens.ink}`,
      boxShadow: shadow, fontFamily: SchFonts.chrome,
      position: 'relative', ...style,
    }}>
      {/* title bar */}
      <div style={{
        background: titleColor, color: titleFg,
        borderBottom: `2px solid ${SchTokens.ink}`,
        padding: '5px 8px 4px', display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: SchFonts.pixel, fontSize: 20, lineHeight: 1, letterSpacing: .5,
      }}>
        {icon && <span style={{ display: 'inline-block', width: 14, height: 14 }}>{icon}</span>}
        <span style={{ flex: 1, textShadow: '1px 1px 0 rgba(0,0,0,.25)' }}>{title}</span>
        {titleRight}
        {onClose && (
          <button onClick={onClose} title="close"
            style={{ width: 14, height: 14, padding: 0, background: SchTokens.paper,
              border: `1.5px solid ${SchTokens.ink}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontFamily: SchFonts.chrome, fontWeight: 700,
              color: SchTokens.ink, lineHeight: 1 }}>×</button>
        )}
      </div>
      <div style={{ padding: noPad ? 0 : 12 }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SchBinderRings — vertical column of black drag-handle "rings"
// ─────────────────────────────────────────────────────────────
function SchBinderRings({ count = 5, color = SchTokens.ink, size = 8, gap = 4, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, alignItems: 'center',
                  padding: `${gap}px 4px`, cursor: 'grab', ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: color,
          boxShadow: `inset 1px 1px 0 rgba(255,255,255,.35), ${SchTokens.shadowSm}`,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SchHello — mustard "Hello!" banner tab (header + banner style)
// ─────────────────────────────────────────────────────────────
function SchHello({ children, bg = SchTokens.mustard, fg = SchTokens.ink, style = {}, size = 'md' }) {
  const fontSize = size === 'lg' ? 32 : size === 'sm' ? 18 : 24;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg, color: fg,
      border: `2px solid ${SchTokens.ink}`,
      boxShadow: SchTokens.shadow,
      padding: '4px 16px 2px',
      fontFamily: SchFonts.pixel, fontSize, lineHeight: 1,
      letterSpacing: .5,
      ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// SchToggle — the maroon slider from Scherzo (On/Off)
// ─────────────────────────────────────────────────────────────
function SchToggle({ value, onChange, labels = ['On', 'Off'], width = 140 }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex' }}>
        {labels.map((l, i) => (
          <button key={l} onClick={() => onChange && onChange(i === 0)}
            style={{
              flex: 1, minWidth: width / 2,
              background: (i === 0) === value ? SchTokens.plum : SchTokens.paper,
              color:      (i === 0) === value ? SchTokens.paper : SchTokens.ink,
              fontFamily: SchFonts.pixel, fontSize: 18, letterSpacing: .5,
              padding: '3px 0 1px', border: `2px solid ${SchTokens.ink}`,
              borderRight: i === 0 ? 'none' : `2px solid ${SchTokens.ink}`,
              cursor: 'pointer', lineHeight: 1,
              boxShadow: (i === 0) === value ? 'inset 2px 2px 0 rgba(0,0,0,.25)' : SchTokens.bevelOut,
            }}>{l}</button>
        ))}
      </div>
      {/* slider track w/ knob */}
      <div style={{ position: 'relative', height: 14, background: SchTokens.paper,
        border: `2px solid ${SchTokens.ink}`, boxShadow: SchTokens.bevelIn, width }}>
        <div style={{ position: 'absolute', top: 2, bottom: 2, left: 2, right: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 2px', fontFamily: SchFonts.chrome, fontSize: 10, color: SchTokens.ink }}>
          <span>◆</span><span>◆</span>
        </div>
        <div style={{ position: 'absolute', top: -4, bottom: -4,
          width: 22, background: SchTokens.plum,
          border: `2px solid ${SchTokens.ink}`, boxShadow: SchTokens.shadowSm,
          left: value ? 4 : 'calc(100% - 26px)',
          transition: 'left .2s cubic-bezier(.6,1.5,.4,1)',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SchFloaters — scattered background primitives (triangles, spheres, cubes)
// density: 0..10
// ─────────────────────────────────────────────────────────────
function SchFloaters({ density = 5, seed = 7, palette = ['plum', 'mustard', 'lavender', 'seafoam', 'forest'] }) {
  // deterministic PRNG
  const rand = React.useMemo(() => {
    let s = seed * 9301 + 49297;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  }, [seed]);

  const count = Math.round(density * 2.5);
  const items = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const kind = ['triangle', 'sphere', 'cube', 'square', 'diamond'][Math.floor(rand() * 5)];
      arr.push({
        kind,
        x: rand() * 100, y: rand() * 100,
        size: 20 + rand() * 40,
        rot: rand() * 360,
        color: SchTokens[palette[Math.floor(rand() * palette.length)]],
      });
    }
    return arr;
  }, [count]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <SchDitherPattern id="sch-fl-dither-plum" c1={SchTokens.plum} c2="transparent" size={2} />
          <SchDitherPattern id="sch-fl-dither-mustard" c1={SchTokens.mustard} c2="transparent" size={2} />
        </defs>
        {items.map((it, i) => {
          const t = `translate(${it.x}% ${it.y}%) rotate(${it.rot})`;
          const s = { fill: it.color, stroke: SchTokens.ink, strokeWidth: 2 };
          if (it.kind === 'triangle') {
            const h = it.size;
            return <polygon key={i} points={`0,${-h/2} ${h/2},${h/2} ${-h/2},${h/2}`}
              transform={t} style={s} />;
          }
          if (it.kind === 'sphere') {
            return (
              <g key={i} transform={t}>
                <circle r={it.size/2} fill={it.color} stroke={SchTokens.ink} strokeWidth={2} />
                <path d={`M ${-it.size/2 + 4} ${-4} a ${it.size/2 - 4} ${it.size/4} 0 0 1 ${it.size - 8} 0`}
                  fill="none" stroke="rgba(255,255,255,.4)" strokeWidth={2} />
              </g>
            );
          }
          if (it.kind === 'cube') {
            const d = it.size / 2;
            return (
              <g key={i} transform={t}>
                <polygon points={`${-d},${-d*.5} 0,${-d} ${d},${-d*.5} 0,0`} fill={SchTokens.paper} stroke={SchTokens.ink} strokeWidth={2} />
                <polygon points={`${-d},${-d*.5} ${-d},${d*.5} 0,${d} 0,0`} fill={it.color} stroke={SchTokens.ink} strokeWidth={2} />
                <polygon points={`0,0 0,${d} ${d},${d*.5} ${d},${-d*.5}`} fill={SchTokens.inkSoft} stroke={SchTokens.ink} strokeWidth={2} />
              </g>
            );
          }
          if (it.kind === 'square') {
            return <rect key={i} x={-it.size/2} y={-it.size/2} width={it.size} height={it.size}
              transform={t} style={s} />;
          }
          // diamond
          const h = it.size;
          return <polygon key={i} points={`0,${-h/2} ${h/2},0 0,${h/2} ${-h/2},0`}
            transform={t} style={s} />;
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SchDitherBar — progress bar with real checkerboard dither fill
// ─────────────────────────────────────────────────────────────
function SchDitherBar({ value = 0.5, max = 1, height = 22, warn = 0.85, style = {}, fg = SchTokens.plum, bg = SchTokens.paper }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const over = pct > warn;
  const fillColor = over ? SchTokens.plum : fg;
  return (
    <div style={{
      height, background: bg, border: `2px solid ${SchTokens.ink}`,
      boxShadow: SchTokens.bevelIn, position: 'relative', overflow: 'hidden', ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0, width: `${pct * 100}%`,
        background: fillColor,
        backgroundImage: schDitherUrl(fillColor, over ? SchTokens.mustard : SchTokens.paperDk, 2),
      }} />
      {/* tick marks every 10% */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ flex: 1, borderRight: `1px solid ${SchTokens.ink}44` }} />
        ))}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SchIcon — tiny pixel-styled glyphs (cassette, folder, disk, etc)
// ─────────────────────────────────────────────────────────────
function SchIcon({ name, size = 16, color = SchTokens.ink }) {
  const paths = {
    cassette: (
      <g fill={color}>
        <rect x="1" y="4" width="14" height="9" stroke={color} strokeWidth="1" fill="none"/>
        <circle cx="5" cy="9" r="1.5"/><circle cx="11" cy="9" r="1.5"/>
        <rect x="3" y="11" width="10" height="1"/>
      </g>
    ),
    folder: (
      <g fill={color}>
        <rect x="1" y="5" width="14" height="9" stroke={color} strokeWidth="1" fill="none"/>
        <rect x="1" y="3" width="6" height="3" stroke={color} strokeWidth="1" fill="none"/>
      </g>
    ),
    disk: (
      <g fill="none" stroke={color} strokeWidth="1">
        <rect x="1" y="1" width="14" height="14"/>
        <rect x="4" y="1" width="8" height="5"/>
        <rect x="6" y="2" width="1" height="3" fill={color}/>
      </g>
    ),
    grid: (
      <g fill={color}>
        <rect x="1" y="1" width="4" height="4"/><rect x="7" y="1" width="4" height="4"/>
        <rect x="1" y="7" width="4" height="4"/><rect x="7" y="7" width="4" height="4"/>
      </g>
    ),
    search: (
      <g fill="none" stroke={color} strokeWidth="1.5">
        <circle cx="6" cy="6" r="4"/><path d="M9 9l4 4"/>
      </g>
    ),
    plus: (
      <g fill={color}><rect x="6" y="2" width="3" height="11"/><rect x="2" y="6" width="11" height="3"/></g>
    ),
    play: (
      <polygon points="3,2 13,8 3,14" fill={color} />
    ),
    print: (
      <g fill="none" stroke={color} strokeWidth="1">
        <rect x="2" y="5" width="11" height="6"/>
        <rect x="4" y="2" width="7" height="3"/>
        <rect x="4" y="9" width="7" height="4"/>
      </g>
    ),
    x: (
      <g stroke={color} strokeWidth="2"><path d="M3 3l9 9M12 3l-9 9"/></g>
    ),
    heart: (
      <path d="M8 13 L2 7 A3 3 0 0 1 8 5 A3 3 0 0 1 14 7 Z" fill={color} />
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      {paths[name] || null}
    </svg>
  );
}

Object.assign(window, {
  SchTokens, SchFonts, SchDitherPattern, schDitherUrl,
  SchWindow, SchBinderRings, SchHello, SchToggle,
  SchFloaters, SchDitherBar, SchIcon,
});
