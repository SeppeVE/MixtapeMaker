import { JCard } from '../../types';
import { JCardLibraryState, StorageStatus } from '../../hooks/useJCardLibrary';
import '../../styles/jcard/JCardLibrary.css';

interface JCardLibraryProps {
  library: JCardLibraryState;
  onOpenCard: (card: JCard) => void;
  onNewCard: () => void;
  onOpenAuth: () => void;
  embedded?: boolean;
}

const Badge = ({ status }: { status: StorageStatus }) => (
  <span className={`jcl-badge jcl-badge-${status}`}>
    {status === 'local'  && '💾 Local'}
    {status === 'cloud'  && '☁ Cloud'}
    {status === 'synced' && '✓ Synced'}
  </span>
);

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const JCardLibrary = ({ library, onOpenCard, onNewCard, onOpenAuth, embedded = false }: JCardLibraryProps) => {
  const {
    allCards,
    loading,
    error,
    uploadingIds,
    loadCards,
    cardStatus,
    uploadCard,
    deleteCard,
    user,
  } = library;

  const handleDelete = async (card: JCard, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteCard(card);
  };

  return (
    <div className={`jcard-library${embedded ? ' jcard-library--embedded' : ''}`}>
      {!embedded && (
        <div className="jcard-library-header">
          <h2 className="jcard-library-title">J-Cards</h2>
          <button className="btn btn-primary" onClick={onNewCard}>+ New Card</button>
        </div>
      )}

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
              <div
                key={card.id}
                className="jcard-card"
                onClick={() => onOpenCard(card)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onOpenCard(card)}
              >
                <div className="jcard-card-swatch" style={{ backgroundColor: card.content.backgroundColor }} />
                <div className="jcard-card-info">
                  <p className="jcard-card-name">{card.title || 'Untitled'}</p>
                  <p className="jcard-card-meta">
                    {card.content.flaps} flap{card.content.flaps !== 1 ? 's' : ''} · {fmt(card.updatedAt)}
                  </p>
                </div>
                <div className="jcl-card-actions" onClick={e => e.stopPropagation()}>
                  <Badge status={status} />
                  {status === 'local' && user && (
                    <button
                      className="jcl-upload-btn btn"
                      onClick={() => uploadCard(card)}
                      disabled={isUploading}
                      title="Upload to cloud"
                    >
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
