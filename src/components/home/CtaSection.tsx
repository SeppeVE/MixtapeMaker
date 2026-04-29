import { User } from '@supabase/supabase-js';
import { Mixtape } from '../../types';

interface CtaSectionProps {
  onNewMixtape: () => void;
  onOpenJCards: () => void;
  onLoadMixtape: (mixtape: Mixtape) => void;
  user: User | null;
  recentTapes: Mixtape[];
}

const CtaSection = ({ onNewMixtape, onOpenJCards, onLoadMixtape, user, recentTapes }: CtaSectionProps) => (
  <section className="lp-cta-section">
    <div className="lp-section-inner">
      <div className="lp-cta-inner">
        <div className="lp-cta-headline">Ready to<br />make a tape?</div>

        <div className="lp-cta-cards">
          <button className="lp-cta-card" onClick={onNewMixtape}>
            <div className="lp-cta-card-head" style={{ background: 'var(--color-forest)' }}>
              <div className="lp-cta-card-icon">📼</div>
              <div className="lp-cta-card-title">Mixtape Editor</div>
              <p className="lp-cta-card-desc">Build, balance, and perfect your track list with real-time tape length calculation.</p>
            </div>
            <div className="lp-cta-card-foot">
              <span>Start mixing</span>
              <span>→</span>
            </div>
          </button>

          <button className="lp-cta-card" onClick={onOpenJCards}>
            <div className="lp-cta-card-head" style={{ background: 'var(--color-plum)' }}>
              <div className="lp-cta-card-icon">🃏</div>
              <div className="lp-cta-card-title">J-Card Designer</div>
              <p className="lp-cta-card-desc">Upload cover art, style the spine and back panel, and export a print-ready PDF.</p>
            </div>
            <div className="lp-cta-card-foot">
              <span>Start designing</span>
              <span>→</span>
            </div>
          </button>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '1px', opacity: 0.5, color: 'var(--color-text)' }}>
          No account · No cost · 100% in your browser
        </div>

        {/* Recent tapes for signed-in users */}
        {user && recentTapes.length > 0 && (
          <div className="lp-recent">
            <div className="lp-recent-heading">⌯ Your Recent Tapes</div>
            <div className="lp-recent-row">
              {recentTapes.map(tape => (
                <div key={tape.id} className="lp-tape-card" onClick={() => onLoadMixtape(tape)}>
                  <div className="lp-tape-card-top">
                    <span className="lp-tape-card-title">{tape.title}</span>
                    <span className="lp-tape-card-len">C{tape.cassetteLength}</span>
                  </div>
                  <div className="lp-tape-card-body">
                    A · {tape.sideA.length} trk<br />
                    B · {tape.sideB.length} trk
                  </div>
                  <div className="lp-tape-card-footer">
                    <span className="lp-tape-card-action">▶ Load</span>
                    <span className="lp-tape-card-date">
                      {new Date(tape.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </section>
);

export default CtaSection;
