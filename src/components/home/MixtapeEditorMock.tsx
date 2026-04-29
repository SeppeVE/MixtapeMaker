const MOCK_SONGS = [
  { title: 'Fade Into You',        artist: 'Mazzy Star',    dur: '3:35' },
  { title: 'Dreams',               artist: 'Fleetwood Mac', dur: '4:14' },
  { title: 'The Chain',            artist: 'Fleetwood Mac', dur: '4:30' },
  { title: 'Running Up That Hill', artist: 'Kate Bush',     dur: '5:02' },
];

const MixtapeEditorMock = () => (
  <div className="lp-mock-window lp-shadow-lg">
    {/* App-style title bar */}
    <div style={{
      background: 'var(--color-text)',
      color: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '4px 8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
    }}>
      <div className="lp-mock-close" style={{ background: 'var(--color-paper)' }}>×</div>
      <span style={{ opacity: 0.6 }}>◀ Library</span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span>Summer Drive '94</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', background: 'var(--color-forest)', color: 'var(--color-paper)', padding: '1px 8px' }}>🎴 J-Cards</span>
      <span style={{ background: 'var(--color-plum)', color: 'var(--color-paper)', padding: '2px 10px 1px', fontFamily: 'var(--font-display)', fontSize: '14px' }}>Save</span>
    </div>

    {/* Side header */}
    <div style={{
      background: 'var(--color-forest)',
      color: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '5px 8px 4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '0.3px' }}>◀ SIDE A</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', opacity: 0.85 }}>17:21 / 30:00</span>
    </div>

    {/* Song list */}
    <div style={{
      background: 'var(--color-seafoam)',
      padding: '7px',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    }}>
      {MOCK_SONGS.map((song, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'stretch',
          background: 'var(--color-paper)',
          border: '2px solid var(--color-text)',
          boxShadow: '2px 2px 0 var(--color-text)',
        }}>
          {/* Number tab */}
          <div style={{
            background: 'var(--color-forest)',
            color: 'var(--color-paper)',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            minWidth: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '2px solid var(--color-text)',
            padding: '5px 4px',
            position: 'relative',
            flexShrink: 0,
          }}>
            {i + 1}
            <div style={{
              position: 'absolute',
              top: 0, right: 0,
              width: '6px', height: '6px',
              background: 'var(--color-seafoam)',
              borderLeft: '1.5px solid var(--color-text)',
              borderBottom: '1.5px solid var(--color-text)',
            }} />
          </div>

          {/* Song info */}
          <div style={{
            flex: 1,
            padding: '5px 9px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}>
            <div style={{ fontWeight: 700, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {song.title}
            </div>
            <div style={{ color: 'var(--color-text-light)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
              {song.artist}
            </div>
          </div>

          {/* Duration */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '15px',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text)',
            opacity: 0.7,
            flexShrink: 0,
          }}>
            {song.dur}
          </div>
        </div>
      ))}

      {/* Ghost "add" row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-paper)',
        border: '2px dashed rgba(42,30,40,0.25)',
        padding: '6px 9px',
        opacity: 0.45,
        gap: '8px',
      }}>
        <div style={{
          minWidth: '30px',
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          opacity: 0.5,
        }}>+</div>
        <span style={{ fontSize: '11px', fontStyle: 'italic' }}>add a track…</span>
      </div>
    </div>

    {/* Tape meter footer */}
    <div style={{
      borderTop: '2px solid var(--color-text)',
      background: 'var(--color-paper)',
      padding: '7px 10px 8px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-display)',
        fontSize: '15px',
        lineHeight: 1,
        marginBottom: '5px',
      }}>
        <span style={{ opacity: 0.7 }}>Used: 17:21</span>
        <span style={{ color: 'var(--color-forest)' }}>12:39 free</span>
      </div>
      {/* Fill bar */}
      <div style={{
        height: '16px',
        background: 'var(--color-white)',
        border: '2px solid var(--color-text)',
        boxShadow: 'inset -1px -1px 0 rgba(255,255,255,.5), inset 1px 1px 0 rgba(0,0,0,.35)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: '58%',
          background: 'var(--color-plum)',
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 3px, rgba(0,0,0,.18) 3px, rgba(0,0,0,.18) 6px)',
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
          {[...Array(9)].map((_, j) => (
            <div key={j} style={{ flex: 1, borderRight: '1px solid rgba(42,30,40,.28)' }} />
          ))}
        </div>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-display)',
        fontSize: '11px',
        opacity: 0.55,
        marginTop: '3px',
      }}>
        <span>0:00</span>
        <span>C-60 (30:00 / side)</span>
        <span>30:00</span>
      </div>
    </div>
  </div>
);

export default MixtapeEditorMock;
