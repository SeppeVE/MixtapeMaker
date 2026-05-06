import '../../styles/mockComponents.css';

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
  <div className="mock-jcard-window">
    {/* Toolbar */}
    <div className="mock-jcard-toolbar">
      <div className="mock-close-btn">×</div>
      <span className="mock-nav-breadcrumb">◀ Editor</span>
      <span className="mock-nav-separator">/</span>
      <span>✦ J-Cards</span>
      <div className="mock-spacer" />
      <span className="mock-export-btn">↓ Export PDF</span>
    </div>

    {/* Card library row */}
    <div className="mock-library-bar">
      <span className="mock-library-tab">✦ J-Cards</span>
      <div className="mock-spacer" />
      <span className="mock-new-card-btn">+ New Card</span>
    </div>

    {/* J-Card preview area */}
    <div className="mock-jcard-preview-area">
      <div className="mock-jcard-container">
        {/* Spine */}
        <div className="mock-jcard-spine-section">
          SUMMER DRIVE '94
        </div>

        {/* Front/cover flap */}
        <div className="mock-jcard-cover-flap">
          {/* Cover art area */}
          <div className="mock-jcard-cover-art">
            <div className="mock-jcard-art-placeholder">
              {[80, 60, 50, 70, 45].map((w, k) => (
                <div key={k} className="mock-jcard-art-line" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="mock-jcard-art-label">
              cover art
            </div>
          </div>
          {/* Title strip */}
          <div className="mock-jcard-title-strip">
            <div className="mock-jcard-title">
              Summer Drive '94
            </div>
            <div className="mock-jcard-subtitle">
              <span className="mock-jcard-artist">Mixed by me</span>
            </div>
          </div>
        </div>

        {/* Back panel */}
        <div className="mock-jcard-back-panel">
          <div className="mock-jcard-side-title">
            SIDE A (17:21)
          </div>
          {SIDE_A_TRACKS.map((t, i) => (
            <div key={i} className="mock-jcard-track">{t}</div>
          ))}
          <div className="mock-jcard-side-b-title">
            SIDE B (18:05)
          </div>
          {SIDE_B_TRACKS.map((t, i) => (
            <div key={i} className="mock-jcard-track">{t}</div>
          ))}
          <div className="mock-jcard-footer">
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
