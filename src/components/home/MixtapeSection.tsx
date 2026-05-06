import MixtapeEditorMock from './MixtapeEditorMock';
import '../../styles/utilities.css';

interface MixtapeSectionProps {
  onNewMixtape: () => void;
}

const MixtapeSection = ({ onNewMixtape }: MixtapeSectionProps) => (
  <section id="mixtape" className="lp-section" style={{ background: 'var(--color-paper)', borderBottom: '3px solid var(--color-text)' }}>
    {/* Geo decorations */}
    <div className="decorative-square decorative-square-mixtape" />
    <div className="decorative-triangle-mixtape">
      <svg width="60" height="60"><polygon points="30,4 56,52 4,52" fill="none" stroke="#3D5A47" strokeWidth="2" /></svg>
    </div>
    <div className="absolute-inset dither-bg-inverse pointer-events-none z-0" />

    <div className="lp-section-inner">
      <div className="lp-split">
        <div className="lp-split-text">
          <div className="lp-section-label" style={{ color: 'var(--color-text-light)' }}>Feature 01</div>
          <div className="lp-section-title" style={{ color: 'var(--color-plum)' }}>The Mixtape<br />Editor.</div>
          <p className="lp-section-body" style={{ color: 'var(--color-text-light)' }}>
            Add tracks to Side A and Side B, and watch the length bar fill
            up in real time because of the auto length calculation. Select the length of your tape and easily fill it with your favourite songs.
          </p>
          <ul className="lp-feature-list" style={{ color: 'var(--color-text-light)' }}>
            <li>Drag-and-drop track ordering for both sides</li>
            <li>Real-time tape fill meter with over-length warnings</li>
            <li>Supports C-46, C-60, C-90, and custom tape lengths</li>
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
