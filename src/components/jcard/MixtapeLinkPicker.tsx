import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loadMixtapes } from '../../utils/database';
import { Mixtape, JCardContent } from '../../types';
import { applyMixtapeToJCard } from '../../utils/jcardDefaults';

interface Props {
  mixtapeId: string | null | undefined;
  currentMixtape: Mixtape | null;
  content: JCardContent;
  onLinkChange: (id: string | null) => void;
  onContentChange: (c: JCardContent) => void;
}

const MixtapeLinkPicker = ({ mixtapeId, currentMixtape, content, onLinkChange, onContentChange }: Props) => {
  const { user } = useAuth();
  const [mixtapes, setMixtapes] = useState<Mixtape[]>([]);
  const [overwriteCover, setOverwriteCover] = useState(false);
  const [showDuration, setShowDuration] = useState(false);

  useEffect(() => {
    if (user) loadMixtapes(user.id).then(setMixtapes).catch(console.error);
  }, [user]);

  const options = user ? mixtapes : currentMixtape ? [currentMixtape] : [];
  const linked = options.find(m => m.id === mixtapeId) ?? null;

  return (
    <div className="settings-section">
      <select
        className="settings-select"
        value={mixtapeId ?? ''}
        onChange={e => onLinkChange(e.target.value || null)}
      >
        <option value="">— None —</option>
        {options.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
      </select>

      {linked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <label className="settings-checkbox-label">
            <input type="checkbox" checked={overwriteCover} onChange={e => setOverwriteCover(e.target.checked)} />
            Also overwrite cover panel
          </label>
          <label className="settings-checkbox-label">
            <input type="checkbox" checked={showDuration} onChange={e => setShowDuration(e.target.checked)} />
            Include track duration
          </label>
          <button className="btn" style={{ fontSize: 12 }} onClick={() => onContentChange(applyMixtapeToJCard(content, linked, { overwriteCover, showDuration }))}>
            ↺ Pull tracks from mixtape
          </button>
          <button className="btn" style={{ fontSize: 12 }} onClick={() => onLinkChange(null)}>
            Unlink
          </button>
        </div>
      )}

      {mixtapeId && !linked && (
        <p style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 4 }}>Linked mixtape no longer available</p>
      )}
    </div>
  );
};
export default MixtapeLinkPicker;
