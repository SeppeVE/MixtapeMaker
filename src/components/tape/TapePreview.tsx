import { useState } from 'react';
import { Mixtape, CassetteLength } from '../../types';
import { calculateTotalDuration, formatTime } from '../../utils/timeUtils';
import '../../styles/TapePreview.css';

interface TapePreviewProps {
  mixtape: Mixtape;
  sideA: boolean;
  isSaving: boolean;
  onUpdate: (updates: Partial<Mixtape>) => void;
  onSave: () => void;
  onNewMixtape: () => void;
}

export default function TapePreview({ mixtape, sideA, isSaving, onUpdate, onSave, onNewMixtape }: TapePreviewProps) {
  const [editingFor, setEditingFor] = useState(false);
  const [forText, setForText] = useState(mixtape.dedicatedTo ?? '');

  const totalA = calculateTotalDuration(mixtape.sideA);
  const totalB = calculateTotalDuration(mixtape.sideB);
  const accentColor = sideA ? '#8FC9B7' : '#B4A0C7';

  const saveFor = () => {
    onUpdate({ dedicatedTo: forText.trim() || undefined });
    setEditingFor(false);
  };

  return (
    <div className="tape-preview">

      {/* Cassette preview panel */}
      <div className="preview-panel">
        <div className="panel-titlebar panel-sage">▧ Preview</div>
        <div className="panel-body">
          <div className="cassette-face">
            {/* Dither overlay */}
            <div className="cassette-dither" />
            {/* Spinning reels */}
            <div className="cassette-reels">
              <div className="reel" style={{ '--reel-color': accentColor } as React.CSSProperties} />
              <div className="reel" style={{ '--reel-color': accentColor } as React.CSSProperties} />
            </div>
            {/* Label strip */}
            <div className="cassette-label-strip">
              <span className="cassette-label-title">{mixtape.title}</span>
              <span className={`cassette-side-badge ${sideA ? 'badge-a' : 'badge-b'}`}>
                SIDE {sideA ? 'A' : 'B'}
              </span>
            </div>
            {/* Tape window */}
            <div className="cassette-tape-window" />
          </div>

          <div className="cassette-meta">
            <MetaRow label="For">
              {editingFor ? (
                <input
                  className="meta-input"
                  value={forText}
                  onChange={e => setForText(e.target.value)}
                  onBlur={saveFor}
                  onKeyDown={e => { if (e.key === 'Enter') saveFor(); if (e.key === 'Escape') setEditingFor(false); }}
                  placeholder="who's this for?"
                  autoFocus
                />
              ) : (
                <span className="meta-value meta-editable" onClick={() => { setForText(mixtape.dedicatedTo ?? ''); setEditingFor(true); }}>
                  {mixtape.dedicatedTo || <span className="meta-placeholder">click to add…</span>}
                </span>
              )}
            </MetaRow>
            <MetaRow label="Length">
              <select
                className="meta-select"
                value={mixtape.cassetteLength}
                onChange={e => onUpdate({ cassetteLength: Number(e.target.value) as CassetteLength })}
              >
                <option value={60}>C60 · 30m / side</option>
                <option value={90}>C90 · 45m / side</option>
                <option value={120}>C120 · 60m / side</option>
              </select>
            </MetaRow>
            <MetaRow label="Side A">
              <span className="meta-value">{mixtape.sideA.length} trk · {formatTime(totalA)}</span>
            </MetaRow>
            <MetaRow label="Side B">
              <span className="meta-value">{mixtape.sideB.length} trk · {formatTime(totalB)}</span>
            </MetaRow>
          </div>
        </div>
      </div>

      {/* Actions panel */}
      <div className="preview-panel">
        <div className="panel-titlebar panel-plum">⚙ Actions</div>
        <div className="panel-body panel-body-actions">
          <button className="btn action-btn" onClick={onSave} disabled={isSaving}>
            ◉ {isSaving ? 'Saving to cloud…' : 'Save to cloud'}
          </button>
          <button className="btn action-btn" onClick={onNewMixtape}>
            + New Mixtape
          </button>
        </div>
      </div>

      {/* Dubbing progress */}
      {isSaving && (
        <div className="dubbing-panel">
          <div className="dubbing-reel" />
          <div className="dubbing-info">
            <div className="dubbing-label">dubbing to cloud…</div>
            <div className="dubbing-bar">
              <div className="dubbing-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="meta-row">
      <span className="meta-key">{label}</span>
      {children}
    </div>
  );
}
