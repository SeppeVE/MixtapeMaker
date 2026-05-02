import { useState, useEffect, useCallback } from 'react';
import { Mixtape, JCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadMixtapes, deleteMixtape } from '../utils/database';
import { listJCards, deleteJCard, upsertJCard } from '../utils/jcardDatabase';
import { loadJCardsFromLocal, deleteJCardFromLocal, saveJCardToLocal } from '../utils/localStorage';
import { formatDuration } from '../utils/timeUtils';
import NavBar from '../components/ui/NavBar';
import '../styles/LibraryPage.css';

type StorageStatus = 'local' | 'cloud' | 'synced';
type Tab = 'mixtapes' | 'jcards';

interface LibraryPageProps {
  currentDraft: Mixtape;
  onLoadMixtape: (mixtape: Mixtape) => void;
  onSaveDraftToCloud: () => Promise<void>;
  isSavingDraft: boolean;
  onGoHome: () => void;
  onOpenAuth: () => void;
  onOpenCard: (card: JCard) => void;
  onNewCard: () => void;
  onNewMixtape: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const totalDuration = (m: Mixtape) =>
  [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);

// ── Storage badge ──────────────────────────────────────────────────────────────
const Badge = ({ status }: { status: StorageStatus }) => (
  <span className={`lib-badge lib-badge-${status}`}>
    {status === 'local'  && '💾 Local'}
    {status === 'cloud'  && '☁ Cloud'}
    {status === 'synced' && '✓ Synced'}
  </span>
);

// ── Sign-in gate ───────────────────────────────────────────────────────────────
const SignInGate = ({ onOpenAuth, message }: { onOpenAuth: () => void; message: string }) => (
  <div className="lib-sign-gate">
    <div className="lib-sign-gate-icon">☁</div>
    <p className="lib-sign-gate-text">{message}</p>
    <button className="lp-btn lp-btn-plum" onClick={onOpenAuth}>Sign In →</button>
  </div>
);

// ═══════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════
const LibraryPage = ({
  currentDraft,
  onLoadMixtape,
  onSaveDraftToCloud,
  isSavingDraft,
  onGoHome,
  onOpenAuth,
  onOpenCard,
  onNewCard,
  onNewMixtape,
  showToast,
}: LibraryPageProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('mixtapes');

  // ── Mixtapes state ──
  const [cloudTapes, setCloudTapes] = useState<Mixtape[]>([]);
  const [tapesLoading, setTapesLoading] = useState(false);

  // ── J-Cards state ──
  const [localCards, setLocalCards] = useState<JCard[]>([]);
  const [cloudCardIds, setCloudCardIds] = useState<Set<string>>(new Set());
  const [allCards, setAllCards] = useState<JCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());

  // ── Load cloud tapes ──
  useEffect(() => {
    if (!user) { setCloudTapes([]); return; }
    setTapesLoading(true);
    loadMixtapes(user.id)
      .then(setCloudTapes)
      .catch(() => showToast('Failed to load tapes', 'error'))
      .finally(() => setTapesLoading(false));
  }, [user]);

  // ── Load + merge J-cards ──
  const loadCards = useCallback(() => {
    setCardsLoading(true);
    const local = loadJCardsFromLocal();
    setLocalCards(local);
    if (user) {
      listJCards(user.id)
        .then(cloud => {
          const ids = new Set(cloud.map(c => c.id));
          setCloudCardIds(ids);
          const merged = [...cloud];
          for (const card of local) {
            if (!ids.has(card.id)) merged.push(card);
          }
          merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setAllCards(merged);
        })
        .catch(() => setAllCards(local))
        .finally(() => setCardsLoading(false));
    } else {
      setAllCards(local);
      setCardsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCards(); }, [loadCards]);

  // ── Helpers ──
  const draftHasSongs = currentDraft.sideA.length > 0 || currentDraft.sideB.length > 0;
  const draftIsUnsaved = draftHasSongs && !cloudTapes.some(t => t.id === currentDraft.id);

  const cardStatus = (card: JCard): StorageStatus => {
    const inCloud = cloudCardIds.has(card.id);
    const inLocal = localCards.some(c => c.id === card.id);
    if (inCloud && inLocal) return 'synced';
    if (inCloud) return 'cloud';
    return 'local';
  };

  // ── Save draft + refresh list ──
  const handleSaveDraftToCloud = async () => {
    await onSaveDraftToCloud();
    if (user) {
      loadMixtapes(user.id).then(setCloudTapes).catch(() => {});
    }
  };

  // ── Tape actions ──
  const handleDeleteTape = async (tape: Mixtape, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${tape.title}"?`)) return;
    try {
      await deleteMixtape(tape.id);
      setCloudTapes(prev => prev.filter(t => t.id !== tape.id));
      showToast('Tape deleted', 'info');
    } catch { showToast('Failed to delete tape', 'error'); }
  };

  // ── J-Card actions ──
  const handleUploadCard = async (card: JCard) => {
    if (!user) { onOpenAuth(); return; }
    setUploadingIds(prev => new Set(prev).add(card.id));
    try {
      const synced = await upsertJCard(card, user.id);

      // The cloud may have assigned a new UUID (when the local id wasn't a UUID).
      // Replace the old local entry with the synced version.
      if (synced.id !== card.id) {
        deleteJCardFromLocal(card.id);
      }
      saveJCardToLocal(synced);

      // Swap the card in the UI list and update the cloud-id set
      setAllCards(prev => prev.map(c => c.id === card.id ? synced : c));
      setCloudCardIds(prev => {
        const s = new Set(prev);
        s.delete(card.id);
        s.add(synced.id);
        return s;
      });
      // Also update the local cards list so cardStatus() stays accurate
      setLocalCards(prev => {
        const without = prev.filter(c => c.id !== card.id);
        return [...without, synced];
      });

      showToast('Card saved to cloud ☁', 'success');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploadingIds(prev => { const s = new Set(prev); s.delete(card.id); return s; }); }
  };

  const handleDeleteCard = async (card: JCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${card.title || 'Untitled'}"?`)) return;
    try {
      const status = cardStatus(card);
      if (status === 'cloud' || status === 'synced') {
        await deleteJCard(card.id);
      }
      if (status === 'local' || status === 'synced') {
        deleteJCardFromLocal(card.id);
      }
      setAllCards(prev => prev.filter(c => c.id !== card.id));
      setCloudCardIds(prev => { const s = new Set(prev); s.delete(card.id); return s; });
      showToast('Card deleted', 'info');
    } catch { showToast('Failed to delete', 'error'); }
  };

  return (
    <div className="lib-page">
      <NavBar
        onGoHome={onGoHome}
        onOpenAuth={onOpenAuth}
        onNewMixtape={onNewMixtape}
      >
        <button className="lp-nav-link" onClick={onGoHome}>◀ Home</button>
        <span className="lp-nav-sep">/</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text)' }}>Library</span>
      </NavBar>

      {/* ── Page header + tabs ── */}
      <div className="lib-header">
        <div className="lib-header-inner">
          <div>
            <div className="lib-page-eyebrow">◆ YOUR COLLECTION</div>
            <h1 className="lib-page-title">Library</h1>
          </div>
          <div className="lib-tabs">
            <button
              className={`lib-tab${activeTab === 'mixtapes' ? ' lib-tab--active' : ''}`}
              onClick={() => setActiveTab('mixtapes')}
            >
              📼 Mixtapes
              {cloudTapes.length > 0 && (
                <span className="lib-tab-count">{cloudTapes.length + (draftIsUnsaved ? 1 : 0)}</span>
              )}
            </button>
            <button
              className={`lib-tab${activeTab === 'jcards' ? ' lib-tab--active' : ''}`}
              onClick={() => setActiveTab('jcards')}
            >
              🎴 J-Cards
              {allCards.length > 0 && (
                <span className="lib-tab-count">{allCards.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="lib-content">
        {activeTab === 'mixtapes' && (
          <div className="lib-section-stack">

            {/* Draft section */}
            {draftIsUnsaved && (
              <section className="lib-section">
                <div className="lib-section-head">
                  <span>Working Draft</span>
                  <span className="lib-section-sub">Not yet saved to cloud</span>
                </div>
                <div
                  className="lib-draft-card"
                  onClick={() => onLoadMixtape(currentDraft)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onLoadMixtape(currentDraft)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="lib-draft-card-left">
                    <div className="lib-draft-title">{currentDraft.title}</div>
                    <div className="lib-draft-meta">
                      Side A · {currentDraft.sideA.length} tracks &nbsp;·&nbsp;
                      Side B · {currentDraft.sideB.length} tracks &nbsp;·&nbsp;
                      C-{currentDraft.cassetteLength}
                    </div>
                  </div>
                  <div className="lib-draft-card-right" onClick={e => e.stopPropagation()}>
                    <Badge status="local" />
                    <button
                      className="lp-btn lp-btn-forest"
                      style={{ fontSize: '16px', padding: '4px 14px 2px' }}
                      onClick={user ? handleSaveDraftToCloud : onOpenAuth}
                      disabled={isSavingDraft}
                    >
                      {isSavingDraft ? 'Saving…' : '☁ Save to Cloud'}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Cloud section */}
            <section className="lib-section">
              <div className="lib-section-head">
                <span>☁ Cloud Library</span>
                {user && !tapesLoading && (
                  <span className="lib-section-sub">{cloudTapes.length} tape{cloudTapes.length !== 1 ? 's' : ''}</span>
                )}
              </div>

              {!user && (
                <SignInGate
                  onOpenAuth={onOpenAuth}
                  message="Sign in to save tapes across devices and access them anywhere."
                />
              )}

              {user && tapesLoading && (
                <div className="lib-loading">Loading tapes…</div>
              )}

              {user && !tapesLoading && cloudTapes.length === 0 && (
                <div className="lib-empty">
                  <div className="lib-empty-icon">📼</div>
                  <p>No cloud tapes yet.</p>
                  <p className="lib-empty-sub">Build a mixtape and hit "Save to Cloud" from the editor.</p>
                  <button className="lp-btn lp-btn-mustard" style={{ marginTop: '8px' }} onClick={onNewMixtape}>
                    ▶ Make a Tape
                  </button>
                </div>
              )}

              {user && !tapesLoading && cloudTapes.length > 0 && (
                <div className="lib-cards-grid">
                  {cloudTapes.map(tape => (
                    <div
                      key={tape.id}
                      className="lib-tape-card"
                      onClick={() => onLoadMixtape(tape)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && onLoadMixtape(tape)}
                    >
                      <div className="lib-tape-card-header">
                        <span className="lib-tape-card-title">{tape.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge status="cloud" />
                          <button
                            className="lib-delete-btn"
                            onClick={e => handleDeleteTape(tape, e)}
                            title="Delete"
                          >×</button>
                        </div>
                      </div>
                      <div className="lib-tape-card-body">
                        <div className="lib-tape-row">
                          <span className="lib-tape-label">Side A</span>
                          <span className="lib-tape-value">{tape.sideA.length} tracks</span>
                        </div>
                        <div className="lib-tape-row">
                          <span className="lib-tape-label">Side B</span>
                          <span className="lib-tape-value">{tape.sideB.length} tracks</span>
                        </div>
                        <div className="lib-tape-row">
                          <span className="lib-tape-label">Total</span>
                          <span className="lib-tape-value">{formatDuration(totalDuration(tape))}</span>
                        </div>
                      </div>
                      <div className="lib-tape-card-footer">
                        <span className="lib-tape-length">C-{tape.cassetteLength}</span>
                        <span className="lib-tape-date">{fmtDate(tape.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'jcards' && (
          <div className="lib-section-stack">

            {/* Cloud sync banner for signed-out users */}
            {!user && allCards.length > 0 && (
              <div className="lib-sync-banner">
                <span>💾 Your cards are saved locally. Sign in to back them up to the cloud.</span>
                <button className="lp-btn lp-btn-plum" style={{ fontSize: '15px', padding: '3px 14px 1px' }} onClick={onOpenAuth}>
                  Sign In
                </button>
              </div>
            )}

            <section className="lib-section">
              <div className="lib-section-head">
                <span>J-Cards</span>
                <button className="lp-btn lp-btn-mustard" style={{ fontSize: '16px', padding: '4px 14px 2px' }} onClick={onNewCard}>
                  + New Card
                </button>
              </div>

              {cardsLoading && <div className="lib-loading">Loading…</div>}

              {!cardsLoading && allCards.length === 0 && (
                <div className="lib-empty">
                  <div className="lib-empty-icon">🎴</div>
                  <p>No J-cards yet.</p>
                  <p className="lib-empty-sub">Design a card for any of your mixtapes.</p>
                  <button className="lp-btn lp-btn-mustard" style={{ marginTop: '8px' }} onClick={onNewCard}>
                    ✦ Create your first J-Card
                  </button>
                </div>
              )}

              {!cardsLoading && allCards.length > 0 && (
                <div className="lib-cards-grid">
                  {allCards.map(card => {
                    const status = cardStatus(card);
                    const isUploading = uploadingIds.has(card.id);
                    return (
                      <div
                        key={card.id}
                        className="lib-jcard-card"
                        onClick={() => onOpenCard(card)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && onOpenCard(card)}
                      >
                        {/* Color swatch + title */}
                        <div
                          className="lib-jcard-swatch"
                          style={{ background: card.content.backgroundColor }}
                        />
                        <div className="lib-jcard-info">
                          <div className="lib-jcard-name">{card.title || 'Untitled'}</div>
                          <div className="lib-jcard-meta">
                            {card.content.flaps} flap{card.content.flaps !== 1 ? 's' : ''} · {fmtDate(card.updatedAt)}
                          </div>
                        </div>
                        {/* Status + actions */}
                        <div className="lib-jcard-actions" onClick={e => e.stopPropagation()}>
                          <Badge status={status} />
                          {status === 'local' && user && (
                            <button
                              className="lib-upload-btn"
                              onClick={() => handleUploadCard(card)}
                              disabled={isUploading}
                              title="Upload to cloud"
                            >
                              {isUploading ? '…' : '↑ Cloud'}
                            </button>
                          )}
                          <button
                            className="lib-delete-btn"
                            onClick={e => handleDeleteCard(card, e)}
                            title="Delete"
                          >×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sign-in gate for users with no account */}
              {!user && allCards.length === 0 && (
                <SignInGate
                  onOpenAuth={onOpenAuth}
                  message="Sign in to save J-cards to the cloud and access them from any device."
                />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
