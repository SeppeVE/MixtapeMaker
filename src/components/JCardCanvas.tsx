import { Mixtape } from '../types';
import { JCardDesign } from './JCardDesigner';
import { formatDuration } from '../utils/timeUtils';

interface JCardCanvasProps {
  mixtape: Mixtape;
  design: JCardDesign;
}

const JCardCanvas = ({ mixtape, design }: JCardCanvasProps) => {
  const totalDurationA = mixtape.sideA.reduce((sum, song) => sum + song.duration, 0);
  const totalDurationB = mixtape.sideB.reduce((sum, song) => sum + song.duration, 0);

  return (
    <div className="jcard-canvas">
      <div className="jcard-preview-label">
        J-Card Preview (Flap1 + Spine + {design.useNormalBack ? 'Normal Back' : 'Short Back'})
      </div>

      <div
        className="jcard-preview"
        style={{
          backgroundColor: design.backgroundColor,
          color: design.textColor,
          fontFamily: design.fontFamily === 'system' ? 'var(--font-body)' :
                     design.fontFamily === 'display' ? 'var(--font-display)' :
                     design.fontFamily,
          height: `${400 * design.scale}px`,
          fontSize: `${design.fontSize * design.scale}px`
        }}
      >
        {/* Flap 1 - Front Panel */}
        <div className="jcard-panel jcard-flap1">
          <div className="jcard-front-content">
            <div
              className="jcard-title"
              style={{ color: design.accentColor }}
            >
              {mixtape.title}
            </div>
            {mixtape.dedicatedTo && (
              <div className="jcard-dedication">
                For {mixtape.dedicatedTo}
              </div>
            )}

            <div className="jcard-cassette-info">
              <div className="jcard-length">C{mixtape.cassetteLength}</div>
              <div className="jcard-brand">MIXTAPE</div>
            </div>
          </div>
        </div>

        {/* Spine Panel */}
        <div className="jcard-panel jcard-spine">
          <div className="jcard-spine-content">
            <div className="jcard-spine-title">{mixtape.title}</div>
          </div>
        </div>

        {/* Back Panel - Normal or Short */}
        {design.useNormalBack ? (
          /* Normal Back Panel with Full Track Listings */
          <div className="jcard-panel jcard-back-normal">
            <div className="jcard-back-normal-content">
              {/* Side A */}
              <div className="jcard-back-side">
                <div className="jcard-back-side-header" style={{ color: design.accentColor }}>
                  SIDE A ({formatDuration(totalDurationA)})
                </div>
                <div className="jcard-back-tracklist">
                  {mixtape.sideA.map((song, index) => (
                    <span key={song.id} className="jcard-back-track-inline">
                      {index + 1}. {song.title} - {song.artist} ({formatDuration(song.duration)})
                      {index < mixtape.sideA.length - 1 ? ' • ' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Side B */}
              <div className="jcard-back-side">
                <div className="jcard-back-side-header" style={{ color: design.accentColor }}>
                  SIDE B ({formatDuration(totalDurationB)})
                </div>
                <div className="jcard-back-tracklist">
                  {mixtape.sideB.map((song, index) => (
                    <span key={song.id} className="jcard-back-track-inline">
                      {index + 1}. {song.title} - {song.artist} ({formatDuration(song.duration)})
                      {index < mixtape.sideB.length - 1 ? ' • ' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="jcard-back-footer">
                <div className="jcard-back-created">
                  {new Date(mixtape.createdAt).toLocaleDateString()}
                </div>
                <div className="jcard-back-logo">🅼 CASSETTE</div>
              </div>
            </div>
          </div>
        ) : (
          /* Short Back Panel */
          <div className="jcard-panel jcard-back-short">
            <div className="jcard-back-short-content">
              <div className="jcard-duration-info">
                <div className="jcard-side-duration">A: {formatDuration(totalDurationA)}</div>
                <div className="jcard-side-duration">B: {formatDuration(totalDurationB)}</div>
              </div>
              <div className="jcard-tracks-count">
                <div>{mixtape.sideA.length} tracks</div>
                <div>{mixtape.sideB.length} tracks</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fold guidelines */}
      <div className="jcard-guidelines">
        <div className="jcard-guideline-text">Fold lines shown for reference</div>
      </div>
    </div>
  );
};

export default JCardCanvas;