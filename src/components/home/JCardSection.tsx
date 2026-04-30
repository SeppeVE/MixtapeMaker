import JCardMock from './JCardMock';

interface JCardSectionProps {
  onOpenJCards: () => void;
}

const JCardSection = ({ onOpenJCards }: JCardSectionProps) => (
  <section id="jcard" className="lp-section" style={{ background: 'var(--color-sage)', borderBottom: '3px solid var(--color-text)' }}>
    {/* Geo decorations */}
    <div style={{ position: 'absolute', top: '50px', left: '80px', opacity: 0.3, pointerEvents: 'none', zIndex: 1 }}>
      <svg width="70" height="70"><polygon points="35,2 68,62 2,62" fill="none" stroke="#2A1E28" strokeWidth="2" /></svg>
    </div>
    <div style={{ position: 'absolute', bottom: '40px', right: '50px', width: '60px', height: '60px', border: '2px solid var(--color-text)', opacity: 0.2, transform: 'rotate(20deg)', pointerEvents: 'none', zIndex: 1 }} />

    <div className="lp-section-inner">
      <div className="lp-split lp-split-reverse">
        <div className="lp-split-text">
          <div className="lp-section-label" style={{ color: 'var(--color-forest)' }}>Feature 02</div>
          <div className="lp-section-title" style={{ color: 'var(--color-text)' }}>The J-Card<br />Designer.</div>
          <p className="lp-section-body" style={{ color: 'var(--color-text-light)' }}>
            Every great mixtape deserves a proper J-card. Upload cover art, style the spine
            with your tape's title, lay out the track list on the back, or one of the inside panels, and export a
            perfectly-sized PDF ready to fold and slip in the case.
          </p>
          <p className="lp-section-body" style={{ color: 'var(--color-text-light)' }}>
            J-card can also be designed without needing to make a mixtape first.
          </p>
          <ul className="lp-feature-list" style={{ color: 'var(--color-text-light)' }}>
            <li>Full J-card template: spine, front and back panels</li>
            <li>Upload your own cover or full-width background art</li>
            <li>Auto-imports track list from your mixtape</li>
            <li>Export as print-ready PDF or high-res PNG</li>
          </ul>
          <div>
            <button className="lp-btn lp-btn-plum" style={{ fontSize: '22px', padding: '7px 22px 4px' }} onClick={onOpenJCards}>
              ✦ Design your J-Card →
            </button>
          </div>
        </div>

        <div className="lp-split-visual">
          <JCardMock />
        </div>
      </div>
    </div>
  </section>
);

export default JCardSection;
