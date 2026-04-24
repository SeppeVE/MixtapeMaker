// J-card designer preview — with tracklist sync toggle, sampled-color spine,
// liner notes WYSIWYG, sticker library, fold preview, paper stock chooser.

function SchJCard({ density = 4 }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: SchTokens.sage,
      fontFamily: SchFonts.chrome, color: SchTokens.ink,
      position: 'relative', overflow: 'hidden',
    }}>
      <SchFloaters density={density} seed={17} palette={['plum', 'mustard', 'lavender', 'seafoam']} />

      {/* menubar */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: SchTokens.paper, borderBottom: `2px solid ${SchTokens.ink}`,
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '4px 12px', fontFamily: SchFonts.pixel, fontSize: 18, lineHeight: 1,
      }}>
        <span>🅼</span>
        <span>◀ Editor</span>
        <span style={{ opacity: .5 }}>/</span>
        <span style={{ flex: 1 }}>J-Card · Kitchen Sink vol. 3</span>
        <button className="sch-btn" style={{ padding: '4px 10px', fontSize: 11 }}>▧ Fold preview</button>
        <button className="sch-btn primary" style={{ padding: '4px 10px', fontSize: 11 }}><SchIcon name="print" size={11} color={SchTokens.paper}/> Print</button>
      </div>

      <div style={{
        position: 'relative', zIndex: 2, height: 'calc(100% - 30px)',
        display: 'grid', gridTemplateColumns: '300px 1fr 240px', gap: 14,
        padding: '16px 20px', boxSizing: 'border-box',
      }}>

        {/* LEFT: tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
          <SchHello size="md" bg={SchTokens.mustard}>J-Card</SchHello>

          <SchWindow title="▣ Template" bg={SchTokens.paper} titleColor={SchTokens.forest}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {['scherzo', 'plain', 'photo', 'xerox'].map((t, i) => (
                <div key={t} style={{
                  aspectRatio: '4/5', background: [SchTokens.seafoam, SchTokens.paper, SchTokens.lavender, SchTokens.mustard][i],
                  border: `2px solid ${SchTokens.ink}`,
                  boxShadow: i === 0 ? SchTokens.shadowSm : 'none',
                  cursor: 'pointer', position: 'relative',
                  outline: i === 0 ? `2px solid ${SchTokens.plum}` : 'none',
                  outlineOffset: 2,
                }}>
                  <div style={{ position: 'absolute', inset: 6, border: `1px dashed ${SchTokens.ink}55` }} />
                  <div style={{ position: 'absolute', bottom: 3, left: 3, right: 3,
                    fontFamily: SchFonts.pixel, fontSize: 10, textAlign: 'center', lineHeight: 1,
                    background: SchTokens.paper, padding: '2px 0',
                    border: `1px solid ${SchTokens.ink}`,
                  }}>{t}</div>
                </div>
              ))}
            </div>
          </SchWindow>

          <SchWindow title="✎ Cover Image" bg={SchTokens.paper} titleColor={SchTokens.plum}>
            <div style={{
              aspectRatio: '3/2', background: SchTokens.paperDk,
              border: `2px dashed ${SchTokens.ink}`,
              backgroundImage: schDitherUrl(SchTokens.paperDk, SchTokens.paper, 3),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              cursor: 'pointer',
            }}>
              <SchIcon name="plus" size={20} />
              <div style={{ fontFamily: SchFonts.pixel, fontSize: 14, lineHeight: 1 }}>drop image</div>
              <div style={{ fontFamily: SchFonts.chrome, fontSize: 9, opacity: .6 }}>png / jpg · max 5mb</div>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
              <button className="sch-btn" style={{ flex: 1, justifyContent: 'center', fontSize: 10 }}>Browse…</button>
              <button className="sch-btn" style={{ flex: 1, justifyContent: 'center', fontSize: 10 }}>Camera</button>
            </div>
            {/* Sampled color palette from image */}
            <div style={{ marginTop: 8, fontFamily: SchFonts.pixel, fontSize: 13, lineHeight: 1, marginBottom: 4 }}>Sampled from image</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[SchTokens.seafoam, SchTokens.forest, SchTokens.mustard, SchTokens.plum, SchTokens.paper].map((c, i) => (
                <div key={i} style={{
                  flex: 1, aspectRatio: '1', background: c,
                  border: `1.5px solid ${SchTokens.ink}`, cursor: 'pointer',
                  outline: i === 0 ? `1.5px solid ${SchTokens.mustard}` : 'none', outlineOffset: 1,
                }} />
              ))}
            </div>
            <div style={{ marginTop: 4, fontFamily: SchFonts.chrome, fontSize: 9, opacity: .6 }}>spine auto-matches ← first pick</div>
          </SchWindow>

          <SchWindow title="ⓣ Title" bg={SchTokens.paper} titleColor={SchTokens.forest}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input className="sch-input" defaultValue="Kitchen Sink vol. 3" />
              <input className="sch-input" defaultValue="for Sam — happy birthday" style={{ fontSize: 11 }}/>
              {/* Font picker */}
              <div style={{ display: 'flex', gap: 4 }}>
                {['PIXEL', 'SANS', 'TYPEWRT', 'MARKER'].map((f, i) => (
                  <button key={f} style={{
                    flex: 1, padding: '4px 2px', fontSize: 9,
                    background: i === 0 ? SchTokens.plum : SchTokens.paper,
                    color: i === 0 ? SchTokens.paper : SchTokens.ink,
                    border: `1.5px solid ${SchTokens.ink}`,
                    fontFamily: SchFonts.pixel, cursor: 'pointer', lineHeight: 1,
                  }}>{f}</button>
                ))}
              </div>
            </div>
          </SchWindow>

          <SchWindow title="▢ Paper stock" bg={SchTokens.paper} titleColor={SchTokens.plum}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: SchFonts.chrome, fontSize: 11 }}>
              {[
                ['◉ cardstock 80lb', true],
                ['○ recycled kraft', false],
                ['○ glossy photo', false],
                ['○ tracing vellum', false],
              ].map(([l, sel], i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  background: sel ? SchTokens.mustard + '40' : 'transparent', padding: '2px 4px' }}>
                  <span style={{ fontFamily: SchFonts.pixel, fontSize: 13 }}>{l}</span>
                </label>
              ))}
            </div>
          </SchWindow>
        </div>

        {/* CENTER: live preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: SchFonts.pixel, fontSize: 18, lineHeight: 1 }}>▧ Live preview</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: SchFonts.pixel, fontSize: 13, opacity: .65 }}>4.0" × 3.9" folded</span>
            <button className="sch-btn" style={{ padding: '3px 7px', fontSize: 10 }}>−</button>
            <button className="sch-btn" style={{ padding: '3px 7px', fontSize: 10 }}>100%</button>
            <button className="sch-btn" style={{ padding: '3px 7px', fontSize: 10 }}>+</button>
          </div>

          <SchWindow title="◫ Print sheet · A4" bg={SchTokens.white} titleColor={SchTokens.plum}
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} noPad>
            <div style={{
              flex: 1, overflow: 'auto',
              backgroundImage: schDitherUrl(SchTokens.white, SchTokens.paperDk, 3),
              padding: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <JCardProof />
            </div>
            <div style={{
              borderTop: `2px solid ${SchTokens.ink}`, padding: '5px 10px',
              background: SchTokens.paperDk, fontFamily: SchFonts.pixel, fontSize: 12, lineHeight: 1,
              display: 'flex', gap: 10, opacity: .8,
            }}>
              <span>─ ─ ─ fold lines</span>
              <span style={{ opacity: .5 }}>|</span>
              <span>+ crop marks</span>
              <span style={{ opacity: .5 }}>|</span>
              <span>⚙ bleed 3mm</span>
            </div>
          </SchWindow>
        </div>

        {/* RIGHT: tracklist sync + stickers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
          {/* Tracklist sync */}
          <SchWindow title="♯ Tracklist" bg={SchTokens.paper} titleColor={SchTokens.forest}>
            <div style={{
              background: SchTokens.mustard + '66',
              border: `1.5px solid ${SchTokens.ink}`, padding: '6px 7px',
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
            }}>
              <div style={{
                width: 18, height: 18, background: SchTokens.forest,
                border: `1.5px solid ${SchTokens.ink}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: SchTokens.paper, fontFamily: SchFonts.pixel, fontSize: 14, lineHeight: 1,
              }}>✓</div>
              <div style={{ flex: 1, fontFamily: SchFonts.pixel, fontSize: 13, lineHeight: 1.1 }}>
                <div>sync with tape</div>
                <div style={{ fontFamily: SchFonts.chrome, fontSize: 9, opacity: .7, marginTop: 1 }}>auto-updates if tape changes</div>
              </div>
            </div>
            <div style={{ fontFamily: SchFonts.chrome, fontSize: 10, lineHeight: 1.4, opacity: .75 }}>
              <div style={{ fontFamily: SchFonts.pixel, fontSize: 13, color: SchTokens.forest, marginBottom: 2 }}>SIDE A · 6 trk</div>
              Sparks Out · Pool Hours · Tarpaulin · Running Late · Seafoam, 1996 · Paper Weight
              <div style={{ fontFamily: SchFonts.pixel, fontSize: 13, color: SchTokens.plum, marginTop: 6, marginBottom: 2 }}>SIDE B · 5 trk</div>
              Violet Dusk · Radio Silent · Mustard Lights · Cassette Shrine · Home By Eleven
            </div>
          </SchWindow>

          <SchWindow title="✉ Liner notes" bg={SchTokens.paper} titleColor={SchTokens.plum}>
            {/* WYSIWYG toolbar */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
              {['B', 'I', 'U', '•', '1.'].map((l, i) => (
                <button key={l} style={{
                  width: 22, height: 22, padding: 0,
                  background: SchTokens.paper, border: `1.5px solid ${SchTokens.ink}`,
                  boxShadow: '1px 1px 0 ' + SchTokens.ink, cursor: 'pointer',
                  fontFamily: l === '•' || l === '1.' ? SchFonts.chrome : SchFonts.chrome,
                  fontSize: 11, fontWeight: l === 'B' ? 700 : 400,
                  fontStyle: l === 'I' ? 'italic' : 'normal',
                  textDecoration: l === 'U' ? 'underline' : 'none',
                  lineHeight: 1,
                }}>{l}</button>
              ))}
            </div>
            <textarea className="sch-input" rows={5}
              style={{ resize: 'none', fontFamily: SchFonts.chrome, fontSize: 11 }}
              defaultValue="Songs that remind me of driving around with you in 1996. Play side A on the way there, side B on the way home."/>
          </SchWindow>

          <SchWindow title="◈ Stickers" bg={SchTokens.paper} titleColor={SchTokens.forest}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {['★', 'Hi!', '♥', '✉', '◉', '⚡', '✧', '○'].map((s, i) => (
                <div key={i} style={{
                  aspectRatio: '1', background: [SchTokens.mustard, SchTokens.plum, SchTokens.seafoam, SchTokens.lavender][i % 4],
                  color: i % 4 === 1 ? SchTokens.paper : SchTokens.ink,
                  border: `1.5px solid ${SchTokens.ink}`, boxShadow: '1px 1px 0 ' + SchTokens.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: SchFonts.pixel, fontSize: 14, lineHeight: 1,
                  cursor: 'grab',
                }}>{s}</div>
              ))}
            </div>
            <div style={{ marginTop: 5, fontFamily: SchFonts.chrome, fontSize: 9, opacity: .6, textAlign: 'center' }}>drag onto preview →</div>
          </SchWindow>
        </div>
      </div>
    </div>
  );
}

function JCardProof() {
  const W = 500, coverW = 170, spineW = 38, H = 250;
  return (
    <div style={{
      background: SchTokens.white, width: W, height: H,
      border: `2px solid ${SchTokens.ink}`, boxShadow: SchTokens.shadow,
      display: 'grid', gridTemplateColumns: `${spineW}px ${coverW}px ${coverW}px ${spineW}px`,
      position: 'relative',
    }}>
      {[spineW, spineW + coverW, spineW + coverW * 2].map((x, i) => (
        <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: x, borderLeft: `1px dashed ${SchTokens.ink}66` }} />
      ))}

      {/* Spine B */}
      <div style={{ background: SchTokens.lavender, borderRight: `2px solid ${SchTokens.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap',
          fontFamily: SchFonts.pixel, fontSize: 16, letterSpacing: 1 }}>
          B · Kitchen Sink v3
        </div>
      </div>

      {/* Back cover — tracklist (synced) */}
      <div style={{ padding: '8px 10px', fontFamily: SchFonts.chrome, fontSize: 8, position: 'relative',
        backgroundImage: schDitherUrl(SchTokens.white, SchTokens.paperDk, 2) }}>
        <div style={{ fontFamily: SchFonts.pixel, fontSize: 13, lineHeight: 1, marginBottom: 4,
          display: 'flex', justifyContent: 'space-between' }}>
          <span>SIDE A</span><span style={{ opacity: .6 }}>28:23</span>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', lineHeight: 1.35 }}>
          {['Sparks Out', 'Pool Hours', 'Tarpaulin', 'Running Late', 'Seafoam, 1996', 'Paper Weight'].map((t, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{i + 1}. {t}</span>
              <span style={{ opacity: .6 }}>{['3:42','4:11','2:58','3:24','5:06','4:02'][i]}</span>
            </li>
          ))}
        </ol>
        <div style={{ fontFamily: SchFonts.pixel, fontSize: 13, lineHeight: 1, margin: '6px 0 4px',
          display: 'flex', justifyContent: 'space-between' }}>
          <span>SIDE B</span><span style={{ opacity: .6 }}>18:40</span>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', lineHeight: 1.35 }}>
          {['Violet Dusk', 'Radio Silent', 'Mustard Lights', 'Cassette Shrine'].map((t, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{i + 1}. {t}</span>
              <span style={{ opacity: .6 }}>{['3:15','4:33','3:48','2:44'][i]}</span>
            </li>
          ))}
        </ol>
        {/* sync badge */}
        <div style={{ position: 'absolute', top: 3, right: 3,
          background: SchTokens.mustard, border: `1px solid ${SchTokens.ink}`,
          fontFamily: SchFonts.pixel, fontSize: 9, padding: '0 3px', lineHeight: 1.2 }}>⇄ synced</div>
      </div>

      {/* Front cover */}
      <div style={{ background: SchTokens.seafoam, position: 'relative', overflow: 'hidden',
        borderLeft: `2px solid ${SchTokens.ink}` }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <svg width="100%" height="100%">
            <polygon points="18,180 36,146 54,180" fill={SchTokens.plum} stroke={SchTokens.ink} strokeWidth="1.5" />
            <circle cx="140" cy="36" r="12" fill={SchTokens.mustard} stroke={SchTokens.ink} strokeWidth="1.5" />
            <rect x="124" y="195" width="22" height="22" fill={SchTokens.lavender} stroke={SchTokens.ink} strokeWidth="1.5" transform="rotate(20 135 206)" />
            <polygon points="12,36 22,26 32,36 22,46" fill={SchTokens.plum} stroke={SchTokens.ink} strokeWidth="1.5" />
          </svg>
        </div>
        <div style={{ position: 'absolute', top: 10, left: 10,
          background: SchTokens.mustard, color: SchTokens.ink,
          border: `2px solid ${SchTokens.ink}`, boxShadow: SchTokens.shadowSm,
          padding: '2px 7px 1px',
          fontFamily: SchFonts.pixel, fontSize: 16, lineHeight: 1,
          transform: 'rotate(-3deg)',
        }}>Hello!</div>
        <div style={{ position: 'absolute', bottom: 10, left: 8, right: 8,
          background: SchTokens.paper, color: SchTokens.ink,
          border: `2px solid ${SchTokens.ink}`, boxShadow: SchTokens.shadowSm,
          padding: '5px 7px',
          fontFamily: SchFonts.pixel,
        }}>
          <div style={{ fontSize: 16, lineHeight: 1 }}>Kitchen Sink</div>
          <div style={{ fontSize: 13, lineHeight: 1, marginTop: 1, color: SchTokens.plum }}>volume three</div>
          <div style={{ fontFamily: SchFonts.chrome, fontSize: 7, marginTop: 2, opacity: .7 }}>
            for sam · 04·21·96 · with love
          </div>
        </div>
      </div>

      {/* Spine A (matches sampled seafoam) */}
      <div style={{ background: SchTokens.seafoam, borderLeft: `2px solid ${SchTokens.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap',
          fontFamily: SchFonts.pixel, fontSize: 16, letterSpacing: 1 }}>
          A · Kitchen Sink v3
        </div>
      </div>

      {[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y], i) => (
        <svg key={i} width={10} height={10} style={{ position: 'absolute', left: x - 5, top: y - 5, pointerEvents: 'none' }}>
          <path d="M5 0v10M0 5h10" stroke={SchTokens.ink} strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}

Object.assign(window, { SchJCard });
