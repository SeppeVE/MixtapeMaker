// Editor screen — A/B sides, search w/ A/B add + already-on-tape state,
// drag-drop deck, dither tape meter, dead-air warning, dubbing save,
// shuffle/balance/flip controls, keyboard-shortcut hint chips.

function SchEditor({ theme: initialTheme = 'auto', density = 4, tileStyle = 'floppy', flipping: flippingProp = false }) {
  const [sideA, setSideA] = React.useState(true);
  const [flipping, setFlipping] = React.useState(false);
  const activeTheme = initialTheme === 'auto' ? (sideA ? 'seafoam' : 'lavender') : initialTheme;
  const bg = SchTokens[activeTheme];

  // Authoritative track list, single array, each with side marker
  const tape = [
    { id: 's1', side: 'A', title: 'Sparks Out', artist: 'Lowtide Club', dur: '3:42' },
    { id: 's2', side: 'A', title: 'Pool Hours', artist: 'Marigold Years', dur: '4:11' },
    { id: 's3', side: 'A', title: 'Tarpaulin', artist: 'Night Hymns', dur: '2:58' },
    { id: 's4', side: 'A', title: 'Running Late', artist: 'The Mailbox', dur: '3:24' },
    { id: 's5', side: 'A', title: 'Seafoam, 1996', artist: 'Ocean Ply', dur: '5:06' },
    { id: 's6', side: 'A', title: 'Paper Weight', artist: 'Veer', dur: '4:02' },
    { id: 'b1', side: 'B', title: 'Violet Dusk', artist: 'Amber Brake', dur: '3:15' },
    { id: 'b2', side: 'B', title: 'Radio Silent', artist: 'Plum Society', dur: '4:33' },
    { id: 'b3', side: 'B', title: 'Mustard Lights', artist: 'The Orthography', dur: '3:48' },
    { id: 'b4', side: 'B', title: 'Cassette Shrine', artist: 'Halfmoon', dur: '2:44' },
    { id: 'b5', side: 'B', title: 'Home By Eleven', artist: 'Sun Room', dur: '4:20' },
  ];
  const songs = tape.filter(t => t.side === (sideA ? 'A' : 'B'));

  const toSec = (d) => { const [m, s] = d.split(':').map(Number); return m * 60 + s; };
  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const totalSec = songs.reduce((a, s) => a + toSec(s.dur), 0);
  const tapeCap = 30 * 60; // C60
  const remSec = Math.max(0, tapeCap - totalSec);
  const over = totalSec > tapeCap;

  // Dead-air: if <80% used, show silent gap explicitly
  const deadAir = !over && remSec > tapeCap * 0.15;

  const searchResults = [
    { title: 'Pressure Drop', artist: 'Toots & The Maytals', dur: '2:58', on: null },
    { title: 'Pictures Of You', artist: 'The Cure', dur: '7:24', on: 'A' },
    { title: 'Pyramid Song', artist: 'Radiohead', dur: '4:49', on: null },
    { title: 'Patience', artist: 'Tame Impala', dur: '5:26', on: null },
    { title: 'Party Hard', artist: 'Andrew W.K.', dur: '3:01', on: 'B' },
  ];

  const doFlip = () => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => setSideA(s => !s), 260);
    setTimeout(() => setFlipping(false), 520);
  };

  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      fontFamily: SchFonts.chrome, color: SchTokens.ink,
      position: 'relative', overflow: 'hidden',
      transition: 'background .3s',
    }}>
      <SchFloaters density={density} seed={sideA ? 3 : 11} palette={sideA ? ['plum', 'mustard', 'forest'] : ['plum', 'mustard', 'seafoam']} />

      {/* menubar */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: SchTokens.paper, borderBottom: `2px solid ${SchTokens.ink}`,
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '4px 12px', fontFamily: SchFonts.pixel, fontSize: 18, lineHeight: 1,
      }}>
        <span style={{ fontWeight: 700 }}>🅼</span>
        <span>◀ Library</span>
        <span style={{ opacity: .5 }}>/</span>
        <span style={{ flex: 1 }}>Kitchen Sink vol. 3 <span className="sch-cursor" style={{ opacity: .5 }}></span></span>
        <span style={{ fontSize: 14, opacity: .6, fontFamily: SchFonts.chrome }}>●● Sam · Riley</span>
        <button className="sch-btn" style={{ padding: '4px 10px', fontSize: 11 }}><SchIcon name="print" size={11}/> J-Card</button>
        <button className="sch-btn primary" style={{ padding: '4px 10px', fontSize: 11 }}>Save</button>
      </div>

      {/* workspace */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '16px 20px', display: 'grid',
        gridTemplateColumns: '320px 1fr 300px',
        gap: 16, height: 'calc(100% - 30px)', boxSizing: 'border-box',
      }}>

        {/* LEFT: Search panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <SchHello size="md" bg={SchTokens.mustard}>Search</SchHello>
          <SchWindow title="♪ Spotify" bg={SchTokens.paper} titleColor={SchTokens.forest}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} noPad>
            <div style={{ padding: 10 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="sch-input" placeholder="type a song, artist… ( / )" defaultValue="p" />
                <button className="sch-btn" style={{ padding: '7px 10px' }}><SchIcon name="search" size={12} /></button>
              </div>
              {/* recent chips */}
              <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['radiohead', 'pool hours', 'bowie', 'sun room'].map(c => (
                  <span key={c} style={{
                    fontFamily: SchFonts.chrome, fontSize: 10,
                    background: SchTokens.paperDk, padding: '2px 6px',
                    border: `1px solid ${SchTokens.ink}`, cursor: 'pointer',
                  }}>↺ {c}</span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontFamily: SchFonts.pixel, fontSize: 14, opacity: .65, lineHeight: 1 }}>
                5 results · <span style={{ color: SchTokens.forest }}>●</span> jamie@spotify
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto',
              borderTop: `2px solid ${SchTokens.ink}`,
              backgroundImage: schDitherUrl(SchTokens.paper, SchTokens.paperDk, 2),
              padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {searchResults.map((r, i) => <SearchResult key={i} r={r} activeSide={sideA ? 'A' : 'B'} />)}
            </div>
            {/* keyboard hint footer */}
            <div style={{
              borderTop: `2px solid ${SchTokens.ink}`, padding: '6px 8px',
              background: SchTokens.paperDk, fontFamily: SchFonts.pixel, fontSize: 12, lineHeight: 1,
              display: 'flex', gap: 10, flexWrap: 'wrap', opacity: .8,
            }}>
              <span><Kbd>⏎</Kbd> add to {sideA ? 'A' : 'B'}</span>
              <span><Kbd>⇧⏎</Kbd> other side</span>
              <span><Kbd>/</Kbd> search</span>
            </div>
          </SchWindow>
        </div>

        {/* CENTER: A/B Deck */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

          {/* A/B switcher + tools row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SchHello size="md" bg={sideA ? SchTokens.seafoam : SchTokens.lavender}>
              ▸ Side {sideA ? 'A' : 'B'}
            </SchHello>
            <div style={{ flex: 1 }} />
            <button className="sch-btn" style={{ padding: '5px 9px', fontSize: 10 }} title="Shuffle songs on this side">⤨ Shuffle</button>
            <button className="sch-btn" style={{ padding: '5px 9px', fontSize: 10 }} title="Auto-balance sides to even runtimes">⚖ Balance</button>
            <button className="sch-btn" onClick={doFlip} style={{ padding: '5px 9px', fontSize: 10 }} title="Flip tape">↻ Flip</button>
            <SchToggle value={sideA} onChange={(v) => v !== sideA && doFlip()} labels={['A', 'B']} width={110} />
          </div>

          {/* Deck window (crossfade+slide on side change) */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <div key={sideA ? 'A' : 'B'} style={{
              position: 'absolute', inset: 0,
              animation: 'sch-side-in .36s cubic-bezier(.3,.7,.3,1) both',
            }}>
                <SchWindow title={`⚏ The Deck · Side ${sideA ? 'A' : 'B'}`}
                  bg={sideA ? SchTokens.seafoam : SchTokens.lavender}
                  titleColor={sideA ? SchTokens.forest : SchTokens.plum}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }} noPad>
                  <div style={{
                    flex: 1, overflow: 'auto', padding: 12,
                    display: 'flex', flexDirection: 'column', gap: 7,
                  }}>
                    {songs.map((s, i) => (
                      <SongTile key={s.id} song={s} index={i + 1} style={tileStyle}
                        accent={sideA ? SchTokens.forest : SchTokens.plum} />
                    ))}
                    {/* drop zone */}
                    <div style={{
                      marginTop: 4, padding: '12px 12px',
                      border: `2px dashed ${SchTokens.ink}`,
                      fontFamily: SchFonts.pixel, fontSize: 16, color: SchTokens.ink, opacity: .55,
                      textAlign: 'center', lineHeight: 1,
                      backgroundImage: schDitherUrl('transparent', SchTokens.ink + '15', 3),
                    }}>◌ drop a song here · or press ⏎ from search</div>
                  </div>

                  {/* Tape meter footer */}
                  <div style={{
                    borderTop: `2px solid ${SchTokens.ink}`, padding: '9px 12px',
                    background: SchTokens.paper,
                    display: 'flex', flexDirection: 'column', gap: 5,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SchFonts.pixel, fontSize: 16, lineHeight: 1 }}>
                      <span>{songs.length} tracks · {fmt(totalSec)}</span>
                      <span style={{ color: over ? SchTokens.plum : deadAir ? SchTokens.forest : SchTokens.ink }}>
                        {over ? `⚠ OVER by ${fmt(totalSec - tapeCap)}` :
                         deadAir ? `⌯ ${fmt(remSec)} dead air` :
                         `◷ ${fmt(remSec)} left`}
                      </span>
                    </div>
                    <SchDitherBar value={totalSec} max={tapeCap} height={16} warn={.85} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SchFonts.pixel, fontSize: 11, opacity: .6, lineHeight: 1 }}>
                      <span>C30</span><span>C45</span><span>C60</span><span>C90</span>
                    </div>
                  </div>
                </SchWindow>
            </div>
          </div>
        </div>

        {/* RIGHT: Tape preview + details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
          {/* Tape preview panel */}
          <SchWindow title="▧ Preview" bg={SchTokens.sage}
            titleColor={SchTokens.forest}>
            <div style={{
              aspectRatio: '16/10', background: SchTokens.ink,
              border: `1.5px solid ${SchTokens.ink}`,
              position: 'relative', padding: 14,
              boxShadow: 'inset 2px 2px 0 rgba(255,255,255,.1)',
            }}>
              <div style={{ position: 'absolute', inset: 4, backgroundImage: schDitherUrl(SchTokens.ink, SchTokens.inkSoft, 2), opacity: .6 }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, height: '100%' }}>
                {[0, 1].map((r) => (
                  <div key={r} className="sch-tape-wheel" style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: SchTokens.paper, border: `2px solid ${SchTokens.ink}`,
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 14, height: 14, background: sideA ? SchTokens.seafoam : SchTokens.lavender, border: `1.5px solid ${SchTokens.ink}` }} />
                    {[0, 60, 120].map((a) => (
                      <div key={a} style={{ position: 'absolute', top: '50%', left: '50%', width: 38, height: 1.5, background: SchTokens.ink, transform: `translate(-50%,-50%) rotate(${a}deg)` }} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{
                position: 'absolute', top: 8, left: 14, right: 14,
                background: SchTokens.paper, padding: '3px 6px 2px',
                border: `1px solid ${SchTokens.ink}`,
                fontFamily: SchFonts.pixel, fontSize: 14, lineHeight: 1,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>Kitchen Sink v3</span>
                <span style={{ color: SchTokens.plum }}>★ SIDE {sideA ? 'A' : 'B'}</span>
              </div>
            </div>

            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5, fontFamily: SchFonts.chrome, fontSize: 11 }}>
              <Meta k="For" v="Sam — happy bday" />
              <Meta k="Length" v="C60 (30m/side)" />
              <Meta k="Shared" v="3 friends" />
            </div>
          </SchWindow>

          {/* Quick actions */}
          <SchWindow title="⚙ Actions" bg={SchTokens.paper} titleColor={SchTokens.plum}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="sch-btn" style={{ justifyContent: 'flex-start', fontSize: 11 }}><SchIcon name="print" size={12}/> Design J-card…</button>
              <button className="sch-btn" style={{ justifyContent: 'flex-start', fontSize: 11 }}><SchIcon name="heart" size={12}/> Share with friends</button>
              <button className="sch-btn" style={{ justifyContent: 'flex-start', fontSize: 11 }}><SchIcon name="disk" size={12}/> Duplicate tape</button>
            </div>
          </SchWindow>

          {/* Dubbing progress (cloud save) */}
          <div style={{
            background: SchTokens.paper, border: `2px solid ${SchTokens.ink}`,
            boxShadow: SchTokens.shadowSm, padding: '8px 10px',
            fontFamily: SchFonts.pixel, fontSize: 14, lineHeight: 1.1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div className="sch-tape-wheel" style={{
              width: 20, height: 20, borderRadius: '50%',
              background: SchTokens.forest, border: `1.5px solid ${SchTokens.ink}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: SchTokens.paper }} />
            </div>
            <div style={{ flex: 1 }}>
              <div>dubbing to cloud…</div>
              <div style={{ height: 6, marginTop: 3, background: SchTokens.paperDk, border: `1px solid ${SchTokens.ink}` }}>
                <div style={{ height: '100%', width: '72%', backgroundImage: schDitherUrl(SchTokens.forest, SchTokens.mustard, 2) }} />
              </div>
            </div>
            <span style={{ color: SchTokens.forest }}>72%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <span style={{
      background: SchTokens.paper, color: SchTokens.ink,
      border: `1px solid ${SchTokens.ink}`, boxShadow: '1px 1px 0 ' + SchTokens.ink,
      padding: '1px 4px', fontFamily: SchFonts.chrome, fontSize: 10, lineHeight: 1,
      marginRight: 3,
    }}>{children}</span>
  );
}

function Meta({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8,
      paddingBottom: 3, borderBottom: `1px dashed ${SchTokens.ink}55` }}>
      <span style={{ fontFamily: SchFonts.pixel, fontSize: 13, opacity: .7 }}>{k}</span>
      <span style={{ fontFamily: SchFonts.chrome, fontSize: 10 }}>{v}</span>
    </div>
  );
}

// Search result row — A/B add buttons + already-on-tape indicator.
// activeSide is highlighted; if track is already on a side, both buttons dim
// and the presence is shown as a ✓ chip.
function SearchResult({ r, activeSide = 'A' }) {
  const onA = r.on === 'A', onB = r.on === 'B';
  const onTape = onA || onB;
  const btn = (label, color, on, isActive) => ({
    width: 22, height: 22,
    background: on ? SchTokens.paperDk : color,
    color: on ? SchTokens.ink : SchTokens.paper,
    border: `1.5px solid ${SchTokens.ink}`,
    boxShadow: on ? 'none' : (isActive ? SchTokens.shadowSm : '1px 1px 0 ' + SchTokens.ink),
    cursor: on ? 'default' : 'pointer', padding: 0,
    fontFamily: SchFonts.pixel, fontSize: 14, lineHeight: 1, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: on ? .6 : 1,
    outline: isActive && !on ? `1.5px solid ${SchTokens.mustard}` : 'none',
    outlineOffset: 1,
  });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      background: onTape ? SchTokens.paperDk : SchTokens.white,
      border: `1.5px solid ${SchTokens.ink}`,
      boxShadow: SchTokens.shadowSm, padding: 5,
      opacity: onTape ? .75 : 1,
    }}>
      <div style={{ width: 26, height: 26, background: SchTokens.forest,
        border: `1px solid ${SchTokens.ink}`,
        backgroundImage: schDitherUrl(SchTokens.forest, SchTokens.mustard, 2),
        flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SchFonts.chrome, fontSize: 12, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
        <div style={{ fontFamily: SchFonts.chrome, fontSize: 10, opacity: .65, lineHeight: 1.1, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist} · {r.dur}</span>
          {onTape && (
            <span style={{
              fontFamily: SchFonts.pixel, fontSize: 11, lineHeight: 1,
              background: onA ? SchTokens.forest : SchTokens.plum, color: SchTokens.paper,
              padding: '1px 4px 0', border: `1px solid ${SchTokens.ink}`, flexShrink: 0,
            }}>✓ on {r.on}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        <button style={btn('A', SchTokens.forest, onA, activeSide === 'A')} title={onA ? 'Already on A' : 'Add to Side A'}>A</button>
        <button style={btn('B', SchTokens.plum,   onB, activeSide === 'B')} title={onB ? 'Already on B' : 'Add to Side B'}>B</button>
      </div>
    </div>
  );
}

// Song tile — three styles: floppy, cassette, binder
function SongTile({ song, index, style = 'floppy', accent = SchTokens.forest }) {
  if (style === 'binder') {
    return (
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: SchTokens.paper, border: `2px solid ${SchTokens.ink}`,
        boxShadow: SchTokens.shadowSm,
      }}>
        <div style={{ background: SchTokens.ink, padding: '6px 4px',
          display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', cursor: 'grab' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: SchTokens.paper }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: SchFonts.pixel, fontSize: 16, color: accent, width: 22 }}>{String(index).padStart(2, '0')}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SchFonts.chrome, fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>{song.title}</div>
            <div style={{ fontFamily: SchFonts.chrome, fontSize: 11, opacity: .7, lineHeight: 1.1, marginTop: 2 }}>{song.artist}</div>
          </div>
          <span style={{ fontFamily: SchFonts.pixel, fontSize: 14, opacity: .8 }}>{song.dur}</span>
        </div>
      </div>
    );
  }
  if (style === 'cassette') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: SchTokens.paper, border: `2px solid ${SchTokens.ink}`,
        boxShadow: SchTokens.shadowSm, padding: '5px 10px',
      }}>
        <span style={{ fontFamily: SchFonts.pixel, fontSize: 16, color: accent, width: 22 }}>{String(index).padStart(2, '0')}</span>
        <div style={{ width: 36, height: 22, background: SchTokens.ink,
          border: `1.5px solid ${SchTokens.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: SchTokens.paper }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: SchTokens.paper }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SchFonts.chrome, fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>{song.title}</div>
          <div style={{ fontFamily: SchFonts.chrome, fontSize: 11, opacity: .7, lineHeight: 1.1, marginTop: 2 }}>{song.artist}</div>
        </div>
        <span style={{ fontFamily: SchFonts.pixel, fontSize: 14 }}>{song.dur}</span>
        <button style={{ width: 18, height: 18, background: 'transparent',
          border: 'none', cursor: 'pointer', padding: 0, opacity: .6 }}><SchIcon name="x" size={10}/></button>
      </div>
    );
  }
  // default: floppy
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 0,
      background: SchTokens.paper, border: `2px solid ${SchTokens.ink}`,
      boxShadow: SchTokens.shadowSm, position: 'relative',
    }}>
      <div style={{
        width: 36, background: accent,
        borderRight: `2px solid ${SchTokens.ink}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        position: 'relative', cursor: 'grab',
      }}>
        <div style={{ width: 22, height: 8, background: SchTokens.paper, border: `1px solid ${SchTokens.ink}` }} />
        <div style={{ fontFamily: SchFonts.pixel, fontSize: 12, color: SchTokens.paper, lineHeight: 1 }}>{String(index).padStart(2, '0')}</div>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 6,
          background: SchTokens.paper, borderLeft: `1.5px solid ${SchTokens.ink}`, borderBottom: `1.5px solid ${SchTokens.ink}` }} />
      </div>
      <div style={{ flex: 1, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SchFonts.chrome, fontSize: 13, fontWeight: 700, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
          <div style={{ fontFamily: SchFonts.chrome, fontSize: 11, opacity: .7, lineHeight: 1.1, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
        </div>
        {/* fade/gap knob */}
        <div title="Fade / gap"
          style={{ fontFamily: SchFonts.pixel, fontSize: 11, lineHeight: 1,
          padding: '1px 4px', border: `1px solid ${SchTokens.ink}44`,
          color: SchTokens.ink, opacity: .5, flexShrink: 0, cursor: 'pointer' }}>
          ↘0s
        </div>
        <span style={{ fontFamily: SchFonts.pixel, fontSize: 14, flexShrink: 0 }}>{song.dur}</span>
        <button style={{ width: 18, height: 18, background: 'transparent',
          border: 'none', cursor: 'pointer', padding: 0, opacity: .5, flexShrink: 0 }} title="remove"><SchIcon name="x" size={10}/></button>
      </div>
    </div>
  );
}

Object.assign(window, { SchEditor, SongTile });
