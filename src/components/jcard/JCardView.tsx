import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { JCard, JCardContent, Mixtape } from '../../types';
import { buildBlankJCardContent, applyMixtapeToJCard } from '../../utils/jcardDefaults';
import { generateId } from '../../utils/timeUtils';
import { saveJCardToLocal } from '../../utils/localStorage';
import { createJCard, updateJCard, loadJCard } from '../../utils/jcardDatabase';
import { useAuth } from '../../contexts/AuthContext';
import { registerCustomFonts } from '../../utils/fontManager';
import JCardPreview from './JCardPreview';
import JCardInsidePreview from './JCardInsidePreview';
import JCardSettings from './JCardSettings';
import '../../styles/jcard/JCardView.css';

interface Props {
  initialCard: JCard | null;
  currentMixtape: Mixtape | null;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function makeBlank(userId: string, mixtape: Mixtape | null): JCard {
  const content = mixtape
    ? applyMixtapeToJCard(buildBlankJCardContent(), mixtape, { overwriteCover: true })
    : buildBlankJCardContent();
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

// ─── History helpers ────────────────────────────────────────────────────────
const COALESCE_MS = 600;
const MAX_HISTORY = 20;

// ────────────────────────────────────────────────────────────────────────────

const JCardView = ({ initialCard, currentMixtape, onBack: _onBack, showToast }: Props) => {
  const { user } = useAuth();
  const seed = useMemo(() => initialCard ?? makeBlank(user?.id ?? 'local', currentMixtape), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [card, setCard] = useState<JCard>(seed);
  const [isSaving, setIsSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persisted = useRef(!!initialCard);

  // ── Undo / redo stack (refs → no spurious re-renders for stack internals) ──
  const histStack = useRef<JCard[]>([seed]);
  const histIdx   = useRef(0);
  const lastPushMs = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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

  // ── History mutations ──────────────────────────────────────────────────────
  const pushHistory = useCallback((newCard: JCard) => {
    const now = Date.now();
    const base = histStack.current.slice(0, histIdx.current + 1);
    let next: JCard[];
    if (now - lastPushMs.current < COALESCE_MS && base.length > 0) {
      // Coalesce rapid edits: replace the current tip instead of adding a new entry.
      next = [...base.slice(0, -1), newCard];
    } else {
      next = [...base, newCard];
    }
    next = next.slice(-MAX_HISTORY);
    histStack.current = next;
    histIdx.current   = next.length - 1;
    lastPushMs.current = now;
    setCanUndo(histIdx.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (histIdx.current <= 0) return;
    histIdx.current--;
    lastPushMs.current = 0; // break coalescing after navigation
    const prev = histStack.current[histIdx.current];
    setCard(prev);
    schedule(prev);
    setCanUndo(histIdx.current > 0);
    setCanRedo(true);
  }, [schedule]);

  const redo = useCallback(() => {
    if (histIdx.current >= histStack.current.length - 1) return;
    histIdx.current++;
    lastPushMs.current = 0;
    const next = histStack.current[histIdx.current];
    setCard(next);
    schedule(next);
    setCanUndo(true);
    setCanRedo(histIdx.current < histStack.current.length - 1);
  }, [schedule]);

  // Keyboard shortcuts — Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z.
  // Skipped when focus is inside a contenteditable so Tiptap's own
  // per-editor undo still works for fine-grained text edits.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.contentEditable === 'true') return; // let Tiptap handle it
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (e.key === 'z' &&  e.shiftKey) { e.preventDefault(); redo(); }
      else if (e.key === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const update = (partial: Partial<JCard>) => {
    const updated = { ...card, ...partial, updatedAt: new Date().toISOString() };
    setCard(updated);
    pushHistory(updated);
    schedule(updated);
  };

  const saveNow = () => { if (timer.current) clearTimeout(timer.current); doSave(card, true); };

  return (
    <div className="jcard-view">

      {/* Sub-toolbar */}
      <div className="jcard-view-toolbar">
        <h2 className="jcard-view-title">{card.title || 'Untitled J-Card'}</h2>
        <div className="jcard-history-btns">
          <button className="btn" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↩</button>
          <button className="btn" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">↪</button>
        </div>
        <button className="btn btn-primary" onClick={saveNow} disabled={isSaving}>
          {isSaving ? 'Saving…' : '💾 Save'}
        </button>
      </div>

      {/* 2-column body */}
      <div className="jcard-view-body">

        {/* MAIN — outside + inside previews */}
        <div className="jcard-view-main">
          <div className="jcard-view-preview">
            <span className="jcard-col-label">▧ Outside</span>
            <JCardPreview content={card.content} />
            <span className="jcard-col-label" style={{ marginTop: 8 }}>◧ Inside</span>
            <JCardInsidePreview content={card.content} />
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
            sections={['info', 'presets', 'layout', 'fonts', 'flaps', 'background', 'spine', 'back', 'mixtape', 'export']}
          />
        </aside>

      </div>

    </div>
  );
};

export default JCardView;
         