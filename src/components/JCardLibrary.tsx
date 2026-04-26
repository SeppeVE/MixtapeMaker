import { useState, useEffect } from 'react';
import { JCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { listJCards, deleteJCard } from '../utils/jcardDatabase';
import { loadJCardsFromLocal, deleteJCardFromLocal } from '../utils/localStorage';
import './JCardLibrary.css';

interface Props {
  onOpenCard: (card: JCard) => void;
  onNewCard: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const JCardLibrary = ({ onOpenCard, onNewCard, showToast }: Props) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<JCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const local = loadJCardsFromLocal();
    if (user) {
      listJCards(user.id)
        .then(cloud => {
          // Merge cloud + local: keep the most recently updated version of each card.
          const merged = [...cloud];
          for (const card of local) {
            if (!merged.find(c => c.id === card.id)) merged.push(card);
          }
          merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setCards(merged);
        })
        .catch(() => setCards(local))
        .finally(() => setLoading(false));
    } else {
      setCards(local);
      setLoading(false);
    }
  }, [user]);

  const handleDelete = async (card: JCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${card.title}"?`)) return;
    try {
      if (user) await deleteJCard(card.id); else deleteJCardFromLocal(card.id);
      setCards(prev => prev.filter(c => c.id !== card.id));
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

      {loading && <p className="jcard-library-empty">Loading…</p>}
      {!loading && cards.length === 0 && (
        <div className="jcard-library-empty">
          <p>No J-cards yet.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onNewCard}>Create your first J-card</button>
        </div>
      )}
      {!loading && cards.length > 0 && (
        <div className="jcard-library-grid">
          {cards.map(card => (
            <div key={card.id} className="jcard-card" onClick={() => onOpenCard(card)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpenCard(card)}>
              <div className="jcard-card-swatch" style={{ backgroundColor: card.content.backgroundColor }} />
              <div className="jcard-card-info">
                <p className="jcard-card-name">{card.title || 'Untitled'}</p>
                <p className="jcard-card-meta">{card.content.flaps} flap{card.content.flaps !== 1 ? 's' : ''} · {fmt(card.updatedAt)}</p>
              </div>
              <button className="jcard-card-delete btn" onClick={e => handleDelete(card, e)} title="Delete">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default JCardLibrary;
