import MixtapeEditorMock from './MixtapeEditorMock';

interface MixtapeSectionProps {
  onNewMixtape: () => void;
}

const MixtapeSection = ({ onNewMixtape }: MixtapeSectionProps) => (
  <section id="mixtape" className="lp-section" style={{ background: 'var(--color-paper)', borderBottom: '3px solid var(--color-text)' }}>
    {/* Geo decorations */}
    <div style={{ position: 'absolute', top: '40px', right: '60px', width: '80px', height: '80px', border: '2px solid var(--color-sage)', opacity: 0.35, transform: 'rotate(12deg)', pointerEvents: 'none', zIndex: 1 }} />
    <div style={{ position: 'absolute', bottom: '60px', left: '40px', opacity: 0.25, pointerEvents: 'none', zIndex: 1 }}>
      <svg width="60" height="60"><polygon points="30,4 56,52 4,52" fill="none" stroke="#3D5A47" strokeWidth="2" /></svg>
    </div>
    <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23EFE8D6'/%3E%3Crect width='2' height='2' fill='%232A1E28'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%232A1E28'/%3E%3C/svg%3E\")", pointerEvents: 'none', zIndex: 0 }} />

    <div className="lp-section-inner">
      <div className="lp-split">
        <div className="lp-split-text">
          <div className="lp-section-label" style={{ color: 'var(--color-text-light)' }}>Feature 01</div>
          <div className="lp-section-title" style={{ color: 'var(--color-plum)' }}>The Mixtape<br />Editor.</div>
          <p className="lp-section-body" style={{ color: 'var(--color-text-light)' }}>
            Add tracks to Side A and Side B, enter run times, and watch the length bar fill
            up in real time. Cassette tells you exactly how much tape you have left — no more
            cutting songs short.
          </p>
          <ul className="lp-feature-list" style={{ color: 'var(--color-text-light)' }}>
            <li>Drag-and-drop track ordering for both sides</li>
            <li>Real-time tape fill meter with over-length warnings</li>
            <li>Supports C-46, C-60, C-90, and custom tape lengths</li>
            <li>Import from Spotify or enter tracks manually</li>
          </ul>
          <div>
            <button className="lp-btn lp-btn-forest" style={{ fontSize: '22px', padding: '7px 22px 4px' }} onClick={onNewMixtape}>
              ▶ Try the Mixtape Editor →
            </button>
          </div>
        </div>

        <div className="lp-split-visual">
          <MixtapeEditorMock />
        </div>
      </div>
    </div>
  </section>
);

export default MixtapeSection;
