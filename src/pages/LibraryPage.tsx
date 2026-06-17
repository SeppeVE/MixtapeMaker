import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mixtape, JCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadMixtapes, deleteMixtape } from '../utils/database';
import { formatDuration } from '../utils/timeUtils';
import NavBar from '../components/ui/NavBar';
import HomeFooter from '../components/home/HomeFooter';
import JCardLibrary from '../components/jcard/JCardLibrary';
import { useJCardLibrary } from '../hooks/useJCardLibrary';
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
  onTogglePublic: (mixtapeId: string, isPublic: boolean) => Promise<void>;
  onEnableShare: (mixtapeId: string) => Promise<string>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const buildShareUrl = (token: string) => `${window.location.origin}/share/${token}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const SkeletonTapeCard = () => (
  <div className="lib-skeleton-tape">
    <div className="lib-skeleton-header" />
    <div className="lib-skeleton-body">
      <div className="lib-skeleton-line" />
      <div className="lib-skeleton-line lib-skeleton-line--short" />
      <div className="lib-skeleton-line lib-skeleton-line--short" />
    </div>
    <div className="lib-skeleton-footer" />
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="lib-error-state">
    <span className="lib-error-icon">⚠</span>
    <span className="lib-error-msg">{message}</span>
    <button className="lp-btn lp-btn-mustard" style={{ fontSize: '14px', padding: '4px 14px 2px' }} onClick={onRetry}>
      ↻ Retry
    </button>
  </div>
);

const totalDuration = (m: Mixtape) =>
  [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);

const Badge = ({ status }: { status: StorageStatus }) => (
  <span className={`lib-badge lib-badge-${status}`}>
    {status === 'local'  && '💾 Local'}
    {status === 'cloud'  && '☁ Cloud'}
    {status === 'synced' && '✓ Synced'}
  </span>
);

const SignInGate = ({ onOpenAuth, message }: { onOpenAuth: () => void; message: string }) => (
  <div className="lib-sign-gate">
    <div className="lib-sign-gate-icon">☁</div>
    <p className="lib-sign-gate-text">{message}</p>
    <button className="lp-btn lp-btn-plum" onClick={onOpenAuth}>Sign In →</button>
  </div>
);

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
  onTogglePublic,
  onEnableShare,
  showToast,
}: LibraryPageProps) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<Tab>(tabParam === 'jcards' ? 'jcards' : 'mixtapes');

  const jcardLibrary = useJCardLibrary(showToast, onOpenAuth);
  const { allCards } = jcardLibrary;

  const [cloudTapes, setCloudTapes] = useState<Mixtape[]>([]);
  const [tapesLoading, setTapesLoading] = useState(false);
  const [tapesError, setTapesError] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === 'jcards') setActiveTab('jcards');
    else if (tabParam === 'mixtapes') setActiveTab('mixtapes');
  }, [tabParam]);

  const setTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'mixtapes' ? {} : { tab });
  };

  const loadTapes = useCallback(() => {
    if (!user) { setCloudTapes([]); return; }
    setTapesLoading(true);
    setTapesError(null);
    loadMixtapes(user.id)
      .then(setCloudTapes)
      .catch(() => setTapesError('Failed to load cloud tapes'))
      .finally(() => setTapesLoading(false));
  }, [user]);

  useEffect(() => { loadTapes(); }, [loadTapes]);

  const draftHasSongs = currentDraft.sideA.length > 0 || currentDraft.sideB.length > 0;
  const draftIsUnsaved = draftHasSongs && !cloudTapes.some(t => t.id === currentDraft.id);

  const handleSaveDraftToCloud = async () => {
    await onSaveDraftToCloud();
    if (user) {
      loadMixtapes(user.id).then(setCloudTapes).catch(() => {});
    }
  };

  const handleDeleteTape = async (tape: Mixtape, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${tape.title}"?`)) return;
    try {
      await deleteMixtape(tape.id);
      setCloudTapes(prev => prev.filter(t => t.id !== tape.id));
      showToast('Tape deleted', 'info');
    } catch { showToast('Failed to delete tape', 'error'); }
  };

  const handleTogglePublic = async (tape: Mixtape, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !tape.isPublic;
    setCloudTapes(prev => prev.map(t => t.id === tape.id ? { ...t, isPublic: next } : t));
    try {
      await onTogglePublic(tape.id, next);
    } catch {
      setCloudTapes(prev => prev.map(t => t.id === tape.id ? { ...t, isPublic: tape.isPublic } : t));
    }
  };

  const handleShare = async (tape: Mixtape, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = tape.shareToken ?? await onEnableShare(tape.id);
      if (!tape.shareToken) {
        setCloudTapes(prev => prev.map(t => t.id === tape.id ? { ...t, shareToken: token } : t));
      }
      await navigator.clipboard.writeText(buildShareUrl(token));
      showToast('Share link copied to clipboard', 'success');
    } catch {
      showToast('Failed to create share link', 'error');
    }
  };

  return (
    <div className="lib-page">
      <NavBar
        onGoHome={onGoHome}
        onOpenAuth={onOpenAuth}
      >
        <button className="lp-nav-link" onClick={onGoHome}>◀ Home</button>
        <span className="lp-nav-sep">/</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text)' }}>Library</span>
      </NavBar>

      <div className="lib-header">
        <div className="lib-header-inner">
          <div>
            <div className="lib-page-eyebrow">◆ YOUR COLLECTION</div>
            <h1 className="lib-page-title">Library</h1>
          </div>
          <div className="lib-tabs">
            <button
              className={`lib-tab${activeTab === 'mixtapes' ? ' lib-tab--active' : ''}`}
              onClick={() => setTab('mixtapes')}
            >
              📼 Mixtapes
              {cloudTapes.length > 0 && (
                <span className="lib-tab-count">{cloudTapes.length + (draftIsUnsaved ? 1 : 0)}</span>
              )}
            </button>
            <button
              className={`lib-tab${activeTab === 'jcards' ? ' lib-tab--active' : ''}`}
              onClick={() => setTab('jcards')}
            >
              🎴 J-Cards
              {allCards.length > 0 && (
                <span className="lib-tab-count">{allCards.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="lib-content">
        {activeTab === 'mixtapes' && (
          <div className="lib-section-stack">
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

            <section className="lib-section">
              <div className="lib-section-head">
                <span>Mixtapes</span>
                <button className="lp-btn lp-btn-mustard" style={{ fontSize: '16px', padding: '4px 14px 2px' }} onClick={onNewMixtape}>
                  + New Tape
                </button>
              </div>

              {!user && (
                <SignInGate
                  onOpenAuth={onOpenAuth}
                  message="Sign in to save tapes across devices and access them anywhere."
                />
              )}

              {user && tapesLoading && (
                <div className="lib-cards-grid">
                  {[1, 2, 3].map(n => <SkeletonTapeCard key={n} />)}
                </div>
              )}

              {user && !tapesLoading && tapesError && (
                <ErrorState message={tapesError} onRetry={loadTapes} />
              )}

              {user && !tapesLoading && !tapesError && cloudTapes.length === 0 && (
                <div className="lib-empty">
                  <div className="lib-empty-icon">📼</div>
                  <p>No cloud tapes yet.</p>
                  <p className="lib-empty-sub">Build a mixtape and hit "Save to Cloud" from the editor.</p>
                  <button className="lp-btn lp-btn-mustard" style={{ marginTop: '8px' }} onClick={onNewMixtape}>
                    ▶ Make a Tape
                  </button>
                </div>
              )}

              {user && !tapesLoading && !tapesError && cloudTapes.length > 0 && (
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
                      </div>
                      <div className="lib-tape-card-actions">
                        <Badge status="cloud" />
                        <button
                          className={`lib-public-toggle ${tape.isPublic ? 'lib-badge-public' : 'lib-badge-private'}`}
                          onClick={e => handleTogglePublic(tape, e)}
                          title={tape.isPublic ? 'Public · click to make private' : 'Private · click to make public'}
                        >
                          {tape.isPublic ? '◉ Public' : '◌ Private'}
                        </button>
                        <button
                          className="lib-public-toggle lib-badge-private"
                          onClick={e => handleShare(tape, e)}
                          title="Copy share link"
                        >
                          🔗 Copy Link
                        </button>
                        <button
                          className="lib-delete-btn"
                          onClick={e => handleDeleteTape(tape, e)}
                          title="Delete"
                        >×</button>
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
            <section className="lib-section">
              <div className="lib-section-head">
                <span>J-Cards</span>
                <button className="lp-btn lp-btn-mustard" style={{ fontSize: '16px', padding: '4px 14px 2px' }} onClick={onNewCard}>
                  + New Card
                </button>
              </div>
              <JCardLibrary
                embedded
                library={jcardLibrary}
                onOpenCard={onOpenCard}
                onNewCard={onNewCard}
                onOpenAuth={onOpenAuth}
              />
            </section>
          </div>
        )}
      </div>
      <HomeFooter onNewMixtape={onNewMixtape} />
    </div>
  );
};

export default LibraryPage;
