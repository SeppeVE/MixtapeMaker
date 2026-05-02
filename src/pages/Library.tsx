import { useEffect, useState } from 'react';
import { Mixtape } from '../types';
import { loadMixtapes, deleteMixtape } from '../utils/database';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration } from '../utils/timeUtils';
import '../styles/Library.css';

interface LibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadMixtape: (mixtape: Mixtape) => void;
}

export default function Library({ isOpen, onClose, onLoadMixtape }: LibraryProps) {
  const [mixtapes, setMixtapes] = useState<Mixtape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadUserMixtapes();
    }
  }, [isOpen, user]);

  const loadUserMixtapes = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await loadMixtapes(user.id);
      setMixtapes(data);
    } catch (err) {
      setError('Failed to load mixtapes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mixtapeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this mixtape?')) {
      return;
    }

    try {
      await deleteMixtape(mixtapeId);
      setMixtapes((prev) => prev.filter((m) => m.id !== mixtapeId));
    } catch (err) {
      alert('Failed to delete mixtape');
      console.error(err);
    }
  };

  const handleLoad = (mixtape: Mixtape) => {
    onLoadMixtape(mixtape);
    onClose();
  };

  const getTotalDuration = (mixtape: Mixtape) => {
    const sideADuration = mixtape.sideA.reduce((sum, song) => sum + song.duration, 0);
    const sideBDuration = mixtape.sideB.reduce((sum, song) => sum + song.duration, 0);
    return sideADuration + sideBDuration;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="library-header">
          <h2>My Mixtapes</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="library-content">
          {loading && <div className="library-loading">Loading mixtapes...</div>}

          {error && <div className="library-error">{error}</div>}

          {!loading && !error && mixtapes.length === 0 && (
            <div className="library-empty">
              <p>No saved mixtapes yet.</p>
              <p>Create a mixtape and click "Save to Cloud" to store it here!</p>
            </div>
          )}

          {!loading && !error && mixtapes.length > 0 && (
            <div className="mixtapes-grid">
              {mixtapes.map((mixtape) => (
                <div
                  key={mixtape.id}
                  className="mixtape-card"
                  onClick={() => handleLoad(mixtape)}
                >
                  <div className="mixtape-card-header">
                    <h3>{mixtape.title}</h3>
                    <button
                      className="delete-button"
                      onClick={(e) => handleDelete(mixtape.id, e)}
                      title="Delete mixtape"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mixtape-card-info">
                    <div className="info-row">
                      <span className="label">Length:</span>
                      <span className="value">{mixtape.cassetteLength} min</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Side A:</span>
                      <span className="value">{mixtape.sideA.length} songs</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Side B:</span>
                      <span className="value">{mixtape.sideB.length} songs</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Total:</span>
                      <span className="value">
                        {formatDuration(getTotalDuration(mixtape))}
                      </span>
                    </div>
                  </div>

                  <div className="mixtape-card-date">
                    Updated: {new Date(mixtape.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
