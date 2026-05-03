import { useState } from 'react';
import { Mixtape, CassetteLength } from '../../types';
import { calculateTotalDuration, formatTime } from '../../utils/timeUtils';
import CassetteSVG from './CassetteSVG';
import '../../styles/TapePreview.css';

interface TapePreviewProps {
  mixtape: Mixtape;
  sideA: boolean;
  isSaving: boolean;
  onUpdate: (updates: Partial<Mixtape>) => void;
  onSave: () => void;
  onNewMixtape: () => void;
}

function getSideStatus(totalDur: number, maxDur: number) {
  if (totalDur === 0) return { color: 'rgba(42,30,40,.25)', label: 'empty' };
  if (totalDur > maxDur) return { color: '#d4524a', label: `+${formatTime(totalDur - maxDur)} over` };
  const pct = Math.round((totalDur / maxDur) * 100);
  if (pct < 70) return { color: '#C4962A', label: `${pct}% · gap` };
  return { color: '#4a7c5e', label: `${pct}%` };
}

export default function TapePreview({ mixtape, sideA, isSaving, onUpdate, onSave, onNewMixtape }: TapePreviewProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(mixtape.title);
  const [editingFor, setEditingFor] = useState(false);
  const [forText, setForText] = useState(mixtape.dedicatedTo ?? '');

  const totalA = calculateTotalDuration(mixtape.sideA);
  const totalB = calculateTotalDuration(mixtape.sideB);
  const maxDur = (mixtape.cassetteLength / 2) * 60;
  const accentColor = sideA ? '#8FC9B7' : '#B4A0C7';

  const sideAStatus = getSideStatus(totalA, maxDur);
  const sideBStatus = getSideStatus(totalB, maxDur);

  const isUntitled = mixtape.title === 'Untitled Mixtape';

  const saveTitle = () => {
    const trimmed = titleText.trim();
    if (trimmed) onUpdate({ title: trimmed });
    setEditingTitle(false);
  };

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
          <CassetteSVG
            title={isUntitled ? undefined : mixtape.title}
            side={sideA ? 'A' : 'B'}
            accentColor={accentColor}
            float={false}
          />

          <div className="cassette-meta">

            {/* ── Title — first, most prominent ── */}
            <MetaRow label="Title">
              {editingTitle ? (
                <input
                  className="meta-input"
                  value={titleText}
                  onChange={e => setTitleText(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  placeholder="Name your tape…"
                  autoFocus
                />
              ) : (
                <span
                  className={`meta-value meta-editable${isUntitled ? ' meta-untitled' : ''}`}
                  onClick={() => { setTitleText(mixtape.title); setEditingTitle(true); }}
                >
                  {isUntitled
                    ? <span className="meta-placeholder">✎ name your tape…</span>
                    : <>{mixtape.title} <span className="meta-edit-hint">✎</span></>}
                </span>
              )}
            </MetaRow>

            {/* ── Tape length ── */}
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

            {/* ── Side A with fill status ── */}
            <MetaRow label="Side A">
              <span className="meta-value side-meta">
                <span className="side-status-dot" style={{ background: sideAStatus.color }} />
                <span>{mixtape.sideA.length} trk · {formatTime(totalA)}</span>
                <span className="side-status-label" style={{ color: sideAStatus.color }}>{sideAStatus.label}</span>
              </span>
            </MetaRow>

            {/* ── Side B with fill status ── */}
            <MetaRow label="Side B">
              <span className="meta-value side-meta">
                <span className="side-status-dot" style={{ background: sideBStatus.color }} />
                <span>{mixtape.sideB.length} trk · {formatTime(totalB)}</span>
                <span className="side-status-label" style={{ color: sideBStatus.color }}>{sideBStatus.label}</span>
              </span>
            </MetaRow>

            {/* ── For — deprioritised, last ── */}
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
