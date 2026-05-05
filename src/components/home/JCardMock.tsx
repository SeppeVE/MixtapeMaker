const SIDE_A_TRACKS = [
  '1. Fade Into You — 3:35',
  '2. Dreams — 4:14',
  '3. The Chain — 4:30',
  '4. Running Up That Hill — 5:02',
];

const SIDE_B_TRACKS = [
  '1. Blue — 3:12',
  '2. Heroes — 6:07',
  '3. Maps — 3:40',
  '4. Lovefool — 3:01',
];

const JCardMock = () => (
  <div style={{ boxShadow: '8px 8px 0 var(--color-text)', border: '2.5px solid var(--color-text)' }}>
    {/* Toolbar */}
    <div style={{
      background: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-display)',
      fontSize: '18px',
    }}>
      <div className="lp-mock-close" style={{ background: 'var(--color-paper)' }}>×</div>
      <span style={{ opacity: 0.5 }}>◀ Editor</span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span>✦ J-Cards</span>
      <div style={{ flex: 1 }} />
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '16px',
        background: 'var(--color-mustard)', color: 'var(--color-text)',
        padding: '2px 12px 1px',
        border: '1.5px solid var(--color-text)',
        boxShadow: '2px 2px 0 var(--color-text)',
      }}>↓ Export PDF</span>
    </div>

    {/* Card library row */}
    <div style={{
      background: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '16px',
        background: 'var(--color-mustard)', color: 'var(--color-text)',
        padding: '2px 10px 1px',
        border: '1.5px solid var(--color-text)',
        boxShadow: '2px 2px 0 var(--color-text)',
        cursor: 'default',
      }}>✦ J-Cards</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', opacity: 0.5 }}>+ New Card</span>
    </div>

    {/* J-Card preview area */}
    <div style={{ background: '#e8e0cc', padding: '16px' }}>
      <div style={{
        display: 'flex',
        border: '2px solid var(--color-text)',
        boxShadow: '4px 4px 0 var(--color-text)',
        background: 'var(--color-paper)',
      }}>
        {/* Spine */}
        <div style={{
          width: '34px',
          background: 'var(--color-plum)',
          borderRight: '2px solid var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          writingMode: 'vertical-rl',
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          letterSpacing: '2px',
          color: 'var(--color-paper)',
          padding: '10px 0',
          flexShrink: 0,
          userSelect: 'none',
        }}>
          SUMMER DRIVE '94
        </div>

        {/* Front/cover flap */}
        <div style={{
          flex: 1.15,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '2px solid var(--color-text)',
          minHeight: '200px',
        }}>
          {/* Cover art area */}
          <div style={{
            flex: 1,
            background: 'var(--color-text-light)',
            backgroundImage: [
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px)',
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px)',
            ].join(', '),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '12px',
            minHeight: '130px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '6px', opacity: 0.15 }}>
              {[80, 60, 50, 70, 45].map((w, k) => (
                <div key={k} style={{ width: `${w}%`, height: '3px', background: 'white', borderRadius: '2px' }} />
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              cover art
            </div>
          </div>
          {/* Title strip */}
          <div style={{ padding: '7px 10px', borderTop: '2px solid var(--color-text)', background: 'var(--color-paper)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '0.5px', color: 'var(--color-text)', lineHeight: 1.2 }}>
              Summer Drive '94
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--color-text-light)', opacity: 0.7 }}>Mixed by me</span>
            </div>
          </div>
        </div>

        {/* Back panel */}
        <div style={{
          flex: 1,
          padding: '9px',
          background: '#FAF6EB',
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          color: 'var(--color-text-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1px', marginBottom: '3px', color: 'var(--color-plum)' }}>
            SIDE A (17:21)
          </div>
          {SIDE_A_TRACKS.map((t, i) => (
            <div key={i} style={{ paddingBottom: '2px' }}>{t}</div>
          ))}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1px', marginTop: '5px', marginBottom: '3px', color: 'var(--color-plum)' }}>
            SIDE B (18:05)
          </div>
          {SIDE_B_TRACKS.map((t, i) => (
            <div key={i} style={{ paddingBottom: '2px' }}>{t}</div>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', opacity: 0.4, fontSize: '9px' }}>
            <span>Apr 2026</span>
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
        <div className="lp-btn lp-btn-plum"  style={{ fontSize: '16px', padding: '4px 14px 2px', cursor: 'default', boxShadow: '2px 2px 0 var(--color-text)' }}>↓ Export PDF</div>
        <div className="lp-btn lp-btn-paper" style={{ fontSize: '16px', padding: '4px 14px 2px', cursor: 'default', boxShadow: '2px 2px 0 var(--color-text)' }}>↓ Export PNG</div>
      </div>
    </div>
  </div>
);

export default JCardMock;
