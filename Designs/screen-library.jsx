// Library screen — shelf of saved mixtapes, Scherzo-styled.

function SchLibrary({ theme = 'seafoam', density = 4 }) {
  const bg = SchTokens[theme] || SchTokens.seafoam;
  const accentA = SchTokens.plum;
  const accentB = SchTokens.mustard;

  const tapes = [
    { title: "Kitchen Sink vol. 3", side: "A", tracks: 14, min: 47, color: SchTokens.mustard, label: "For Sam · 04.21.26", hot: true, collab: ['S', 'R'] },
    { title: "Late-Night Drive", side: "B", tracks: 18, min: 59, color: SchTokens.lavender, label: "nocturne / road" },
    { title: "Sunday Morning", side: "A", tracks: 12, min: 42, color: SchTokens.sage, label: "coffee + sunbeams", collab: ['M'] },
    { title: "Gym Rat 1996", side: "B", tracks: 20, min: 61, color: SchTokens.plum, label: "cardio mix", fg: SchTokens.paper },
    { title: "Slow Dances", side: "A", tracks: 10, min: 38, color: SchTokens.seafoam, label: "ballads only" },
    { title: "Rainy Wednesday", side: "B", tracks: 15, min: 49, color: SchTokens.paper, label: "dreary lo-fi" },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      fontFamily: SchFonts.chrome, color: SchTokens.ink,
      position: 'relative', overflow: 'hidden',
    }}>
      <SchFloaters density={density} seed={3} palette={['plum', 'mustard', 'lavender']} />

      {/* menubar */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: SchTokens.paper, borderBottom: `2px solid ${SchTokens.ink}`,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '4px 12px', fontFamily: SchFonts.pixel, fontSize: 18, lineHeight: 1,
      }}>
        <span style={{ fontWeight: 700 }}>🅼 Mixtape</span>
        <span style={{ opacity: .8 }}>File</span>
        <span style={{ opacity: .8 }}>Edit</span>
        <span style={{ opacity: .8 }}>Tape</span>
        <span style={{ opacity: .8 }}>Help</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, fontFamily: SchFonts.chrome, opacity: .7 }}>◔ 10:47 AM</span>
      </div>

      {/* main */}
      <div style={{ position: 'relative', zIndex: 2, padding: '28px 32px 24px', display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100% - 30px)', boxSizing: 'border-box' }}>
        {/* top row: hello + new tape */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SchHello size="lg">Hello, Jamie!</SchHello>
            <div style={{ fontFamily: SchFonts.pixel, fontSize: 22, color: SchTokens.ink, paddingLeft: 4 }}>
              your mixtape collection <span style={{ opacity: .5 }}>— 14 tapes, 7h 42m</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="sch-btn"><SchIcon name="search" size={13}/> Find</button>
            <button className="sch-btn primary"><SchIcon name="plus" size={13} color={SchTokens.paper}/> New Tape</button>
          </div>
        </div>

        {/* tape shelf */}
        <SchWindow title="▦ The Shelf"
          bg={SchTokens.paper}
          titleColor={SchTokens.forest}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          noPad
          titleRight={
            <div style={{ display: 'flex', gap: 6, fontFamily: SchFonts.chrome, fontSize: 10 }}>
              <span style={{ background: SchTokens.paper, color: SchTokens.ink, padding: '2px 6px', border: `1.5px solid ${SchTokens.ink}` }}>grid</span>
              <span style={{ color: SchTokens.paper, padding: '2px 6px' }}>list</span>
            </div>
          }>
          <div style={{ padding: '20px 18px',
            backgroundImage: schDitherUrl(SchTokens.paper, SchTokens.paperDk, 2),
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
          }}>
            {tapes.map((t, i) => <CassetteTile key={i} tape={t} accent={accentA} mustard={accentB} />)}
          </div>
        </SchWindow>
      </div>
    </div>
  );
}

// Cassette tile — physical cassette with label, reels, side marker
function CassetteTile({ tape, accent, mustard }) {
  return (
    <div style={{
      position: 'relative', cursor: 'pointer',
      transition: 'transform .1s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = '')}>
      <div style={{
        background: tape.color, color: tape.fg || SchTokens.ink,
        border: `2px solid ${SchTokens.ink}`,
        boxShadow: SchTokens.shadow,
        padding: 10, position: 'relative',
        fontFamily: SchFonts.chrome,
      }}>
        {/* top label strip */}
        <div style={{
          background: SchTokens.paper, color: SchTokens.ink,
          border: `1.5px solid ${SchTokens.ink}`,
          padding: '4px 8px 3px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          boxShadow: 'inset 1px 1px 0 rgba(255,255,255,.6)',
        }}>
          <span style={{ fontFamily: SchFonts.pixel, fontSize: 18, lineHeight: 1, letterSpacing: .3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tape.title}
          </span>
          <span style={{
            background: tape.side === 'A' ? SchTokens.plum : SchTokens.lavender,
            color: SchTokens.paper,
            padding: '1px 5px 0', fontFamily: SchFonts.pixel, fontSize: 14,
            border: `1px solid ${SchTokens.ink}`, lineHeight: 1,
          }}>SIDE {tape.side}</span>
        </div>

        {/* cassette body w/ reels */}
        <div style={{
          marginTop: 8, position: 'relative', aspectRatio: '16/9',
          background: SchTokens.ink, border: `1.5px solid ${SchTokens.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26,
          boxShadow: 'inset 1px 1px 0 rgba(255,255,255,.1)',
        }}>
          {/* dither underlay */}
          <div style={{ position: 'absolute', inset: 4, backgroundImage: schDitherUrl(SchTokens.ink, SchTokens.inkSoft, 2), opacity: .6 }} />
          {/* reels */}
          {[0, 1].map((r) => (
            <div key={r} className={tape.hot ? 'sch-tape-wheel' : ''} style={{
              width: 28, height: 28, borderRadius: '50%',
              background: SchTokens.paper, border: `2px solid ${SchTokens.ink}`,
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 10, height: 10, background: tape.color, border: `1.5px solid ${SchTokens.ink}` }} />
              {/* spokes */}
              <div style={{ position: 'absolute', inset: 0 }}>
                {[0, 60, 120].map((a) => (
                  <div key={a} style={{ position: 'absolute', top: '50%', left: '50%', width: 24, height: 1.5, background: SchTokens.ink, transform: `translate(-50%,-50%) rotate(${a}deg)` }} />
                ))}
              </div>
            </div>
          ))}
          {/* footer window for tape */}
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 4, height: 3, background: SchTokens.paperDk, borderTop: `1px solid ${SchTokens.ink}` }} />
        </div>

        {/* bottom meta */}
        <div style={{
          marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: SchFonts.pixel, fontSize: 14, lineHeight: 1,
        }}>
          <span style={{ opacity: .85 }}>{tape.label}</span>
          <span>{tape.tracks} trk · {tape.min}m</span>
        </div>

        {/* collaborator badges */}
        {tape.collab && (
          <div style={{ position: 'absolute', top: -8, left: 8, display: 'flex', gap: -4 }}>
            {tape.collab.map((initial, i) => (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: '50%',
                background: [SchTokens.seafoam, SchTokens.lavender, SchTokens.mustard][i % 3],
                color: SchTokens.ink,
                border: `1.5px solid ${SchTokens.ink}`, boxShadow: SchTokens.shadowSm,
                fontFamily: SchFonts.pixel, fontSize: 13, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: i === 0 ? 0 : -6,
              }}>{initial}</div>
            ))}
          </div>
        )}

        {/* hot sticker */}
        {tape.hot && (
          <div style={{
            position: 'absolute', top: -10, right: -10, transform: 'rotate(8deg)',
            background: mustard, color: SchTokens.ink,
            border: `2px solid ${SchTokens.ink}`, boxShadow: SchTokens.shadowSm,
            fontFamily: SchFonts.pixel, fontSize: 14, padding: '2px 6px 1px',
          }}>NEW!</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SchLibrary });
