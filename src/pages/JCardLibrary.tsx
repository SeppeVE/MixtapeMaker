import { useState, useEffect, useCallback } from 'react';
import { JCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { listJCards, deleteJCard, upsertJCard } from '../utils/jcardDatabase';
import { loadJCardsFromLocal, deleteJCardFromLocal, saveJCardToLocal } from '../utils/localStorage';
import '../styles/JCardLibrary.css';

interface Props {
  onOpenCard: (card: JCard) => void;
  onNewCard: () => void;
  onOpenAuth: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type StorageStatus = 'local' | 'cloud' | 'synced';

const Badge = ({ status }: { status: StorageStatus }) => (
  <span className={`jcl-badge jcl-badge-${status}`}>
    {status === 'local'  && '💾 Local'}
    {status === 'cloud'  && '☁ Cloud'}
    {status === 'synced' && '✓ Synced'}
  </span>
);

const JCardLibrary = ({ onOpenCard, onNewCard, onOpenAuth, showToast }: Props) => {
  const { user } = useAuth();
  const [allCards, setAllCards]     = useState<JCard[]>([]);
  const [localCards, setLocalCards] = useState<JCard[]>([]);
  const [cloudCardIds, setCloudCardIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());

  const loadCards = useCallback(() => {
    setLoading(true);
    setError(null);
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
        .catch(() => {
          setError('Failed to load cloud cards — showing local only');
          setAllCards(local);
        })
        .finally(() => setLoading(false));
    } else {
      setAllCards(local);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const cardStatus = (card: JCard): StorageStatus => {
    const inCloud = cloudCardIds.has(card.id);
    const inLocal = localCards.some(c => c.id === card.id);
    if (inCloud && inLocal) return 'synced';
    if (inCloud) return 'cloud';
    return 'local';
  };

  const handleUploadCard = async (card: JCard) => {
    if (!user) { onOpenAuth(); return; }
    setUploadingIds(prev => new Set(prev).add(card.id));
    try {
      const synced = await upsertJCard(card, user.id);
      if (synced.id !== card.id) deleteJCardFromLocal(card.id);
      saveJCardToLocal(synced);
      setAllCards(prev => prev.map(c => c.id === card.id ? synced : c));
      setCloudCardIds(prev => { const s = new Set(prev); s.delete(card.id); s.add(synced.id); return s; });
      setLocalCards(prev => { const without = prev.filter(c => c.id !== card.id); return [...without, synced]; });
      showToast('Card saved to cloud ☁', 'success');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploadingIds(prev => { const s = new Set(prev); s.delete(card.id); return s; }); }
  };

  const handleDelete = async (card: JCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${card.title || 'Untitled'}"?`)) return;
    try {
      const status = cardStatus(card);
      if (status === 'cloud' || status === 'synced') await deleteJCard(card.id);
      if (status === 'local' || status === 'synced') deleteJCardFromLocal(card.id);
      setAllCards(prev => prev.filter(c => c.id !== card.id));
      setCloudCardIds(prev => { const s = new Set(prev); s.delete(card.id); return s; });
      showToast('Card deleted', 'info');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="jcard-library">
      <div className="jcard-library-header">
        <h2 className="jcard-library-title">J-Cards</h2>
        <button className="btn btn-primary" onClick={onNewCard}>+ New Card</button>
      </div>

      {/* Sync banner: signed-out user has local cards */}
      {!user && allCards.length > 0 && (
        <div className="jcl-sync-banner">
          <span>💾 Your cards are saved locally. Sign in to back them up to the cloud.</span>
          <button className="btn" onClick={onOpenAuth}>Sign In</button>
        </div>
      )}

      {loading && <p className="jcard-library-empty">Loading…</p>}

      {!loading && error && (
        <div className="jcl-error">
          <span>⚠ {error}</span>
          <button className="btn" onClick={loadCards}>↻ Retry</button>
        </div>
      )}

      {!loading && !error && allCards.length === 0 && (
        <div className="jcard-library-empty">
          <p>No J-cards yet.</p>
          {!user && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onOpenAuth}>Sign in to get started</button>
          )}
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onNewCard}>Create your first J-card</button>
        </div>
      )}

      {!loading && allCards.length > 0 && (
        <div className="jcard-library-grid">
          {allCards.map(card => {
            const status = cardStatus(card);
            const isUploading = uploadingIds.has(card.id);
            return (
              <div key={card.id} className="jcard-card" onClick={() => onOpenCard(card)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpenCard(card)}>
                <div className="jcard-card-swatch" style={{ backgroundColor: card.content.backgroundColor }} />
                <div className="jcard-card-info">
                  <p className="jcard-card-name">{card.title || 'Untitled'}</p>
                  <p className="jcard-card-meta">{card.content.flaps} flap{card.content.flaps !== 1 ? 's' : ''} · {fmt(card.updatedAt)}</p>
                </div>
                <div className="jcl-card-actions" onClick={e => e.stopPropagation()}>
                  <Badge status={status} />
                  {status === 'local' && user && (
                    <button className="jcl-upload-btn btn" onClick={() => handleUploadCard(card)} disabled={isUploading} title="Upload to cloud">
                      {isUploading ? '…' : '↑ Cloud'}
                    </button>
                  )}
                  <button className="jcard-card-delete btn" onClick={e => handleDelete(card, e)} title="Delete">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default JCardLibrary;
