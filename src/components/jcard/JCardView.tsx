import { useState, useRef, useCallback, useEffect } from 'react';
import { JCard, JCardContent, Mixtape } from '../../types';
import { buildBlankJCardContent, applyMixtapeToJCard } from '../../utils/jcardDefaults';
import { generateId } from '../../utils/timeUtils';
import { saveJCardToLocal } from '../../utils/localStorage';
import { createJCard, updateJCard, loadJCard } from '../../utils/jcardDatabase';
import { useAuth } from '../../contexts/AuthContext';
import { registerCustomFonts } from '../../utils/fontManager';
import JCardPreview from './JCardPreview';
import JCardSettings from './JCardSettings';
import '../../styles/jcard/JCardView.css';

interface Props {
  initialCard: JCard | null;
  currentMixtape: Mixtape | null;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function makeBlank(userId: string, mixtape: Mixtape | null): JCard {
  const content = mixtape ? applyMixtapeToJCard(buildBlankJCardContent(), mixtape) : buildBlankJCardContent();
  return {
    id: generateId(),
    title: mixtape ? `${mixtape.title} — J-Card` : 'Untitled J-Card',
    userId,
    mixtapeId: mixtape?.id ?? null,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const JCardView = ({ initialCard, currentMixtape, onBack, showToast }: Props) => {
  const { user } = useAuth();
  const [card, setCard] = useState<JCard>(() => initialCard ?? makeBlank(user?.id ?? 'local', currentMixtape));
  const [isSaving, setIsSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persisted = useRef(!!initialCard);

  // Re-register custom fonts whenever the card's font list changes so the
  // preview and editors always have them available (e.g. after opening an
  // existing card that has stored fonts).
  useEffect(() => {
    const fonts = card.content.customFonts;
    if (fonts?.length) registerCustomFonts(fonts).catch(console.error);
  }, [card.content.customFonts]);

  const doSave = useCallback(async (target: JCard, feedback: boolean) => {
    setIsSaving(true);
    // Always persist to localStorage first — this guarantees the card is never lost.
    saveJCardToLocal(target);
    try {
      if (user) {
        // Also sync to Supabase when logged in.
        let saved: JCard;
        if (persisted.current) {
          saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
        } else {
          const exists = await loadJCard(target.id);
          if (exists) {
            persisted.current = true;
            saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
          } else {
            saved = await createJCard(user.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
            persisted.current = true;
          }
        }
        setCard(prev => ({ ...prev, id: saved.id, updatedAt: saved.updatedAt }));
      }
      if (feedback) showToast('J-card saved', 'success');
    } catch (e) {
      console.error('Supabase sync failed (card is still saved locally):', e);
      // Don't show an error — card is safely in localStorage.
      if (feedback) showToast('J-card saved', 'success');
    } finally { setIsSaving(false); }
  }, [user, showToast]);

  const schedule = useCallback((updated: JCard) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(updated, false), 1200);
  }, [doSave]);

  const update = (partial: Partial<JCard>) => {
    const updated = { ...card, ...partial, updatedAt: new Date().toISOString() };
    setCard(updated);
    schedule(updated);
  };

  const saveNow = () => { if (timer.current) clearTimeout(timer.current); doSave(card, true); };

  return (
    <div className="jcard-view">

      {/* Sub-toolbar */}
      <div className="jcard-view-toolbar">
        <button className="btn" onClick={onBack}>← Cards</button>
        <h2 className="jcard-view-title">{card.title || 'Untitled J-Card'}</h2>
        <button className="btn btn-primary" onClick={saveNow} disabled={isSaving}>
          {isSaving ? 'Saving…' : '💾 Save'}
        </button>
      </div>

      {/* 2-column body */}
      <div className="jcard-view-body">

        {/* MAIN — preview */}
        <div className="jcard-view-main">
          <div className="jcard-view-preview">
            <span className="jcard-col-label">▧ Live preview</span>
            <JCardPreview content={card.content} />
          </div>
        </div>

        {/* RIGHT — all settings + content */}
        <aside className="jcard-view-right">
          <span className="jcard-col-label">⚙ Settings</span>
          <JCardSettings
            card={card}
            currentMixtape={currentMixtape}
            onTitleChange={(title) => update({ title })}
            onContentChange={(content: JCardContent) => update({ content })}
            onMixtapeLink={(mixtapeId) => update({ mixtapeId })}
            sections={['info', 'layout', 'flaps', 'background', 'fonts', 'spine', 'back', 'mixtape', 'export']}
          />
        </aside>

      </div>
    </div>
  );
};

export default JCardView;
