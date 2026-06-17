import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Mixtape, Song } from '../types';
import { loadPublicMixtape } from '../utils/database';
import { useAuth } from '../contexts/AuthContext';
import { generateId, formatTime, calculateTotalDuration } from '../utils/timeUtils';
import NavBar from '../components/ui/NavBar';
import CassetteSVG from '../components/tape/CassetteSVG';
import HomeFooter from '../components/home/HomeFooter';
import '../styles/LibraryPage.css';
import '../styles/TapeSide.css';

interface PublicMixtapePageProps {
  onGoHome: () => void;
  onOpenAuth: () => void;
  onOpenLibrary: () => void;
  onLoadMixtape: (mixtape: Mixtape) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ReadOnlySide = ({ label, songs }: { label: string; songs: Song[] }) => (
  <div className="tape-side">
    <div className="tape-side-header">
      <span className="side-title">⚏ {label}</span>
      <span>{songs.length} trk · {formatTime(calculateTotalDuration(songs))}</span>
    </div>
    <div className="song-list">
      {songs.length === 0 ? (
        <div className="empty-side">◌ No tracks</div>
      ) : (
        songs.map((song, index) => (
          <div key={`${song.id}-${index}`} className="song-item">
            <div className="song-number">{String(index + 1).padStart(2, '0')}</div>
            {song.albumCover && <img src={song.albumCover} alt={song.album} className="song-artwork" />}
            <div className="song-details">
              <div className="song-item-title">{song.title}</div>
              <div className="song-item-artist">{song.artist} · {formatTime(song.duration)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const PublicMixtapePage = ({ onGoHome, onOpenAuth, onOpenLibrary, onLoadMixtape, showToast }: PublicMixtapePageProps) => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [mixtape, setMixtape] = useState<Mixtape | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    loadPublicMixtape(id)
      .then(result => {
        if (!result) setNotFound(true);
        else setMixtape(result);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = () => {
    if (!mixtape) return;
    if (!user) { onOpenAuth(); return; }
    const now = new Date().toISOString();
    const copy: Mixtape = {
      ...mixtape,
      id: generateId(),
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    };
    onLoadMixtape(copy);
    showToast('Copied to your mixtape — personalize and save it', 'success');
  };

  return (
    <div className="lib-page">
      <NavBar onGoHome={onGoHome} onOpenAuth={onOpenAuth} onOpenLibrary={onOpenLibrary}>
        <button className="lp-nav-link" onClick={onGoHome}>◀ Home</button>
        <span className="lp-nav-sep">/</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text)' }}>Explore</span>
      </NavBar>

      <div className="lib-content">
        {loading && <p style={{ padding: '40px', textAlign: 'center' }}>Loading…</p>}

        {!loading && notFound && (
          <div className="lib-empty">
            <div className="lib-empty-icon">📼</div>
            <p>This mixtape isn't available.</p>
            <p className="lib-empty-sub">It may be private or no longer exist.</p>
          </div>
        )}

        {!loading && mixtape && (
          <div className="lib-section-stack">
            <section className="lib-section">
              <div className="lib-section-head">
                <span>{mixtape.title}</span>
                <button className="lp-btn lp-btn-forest" onClick={handleCopy}>
                  ⎘ Copy to my mixtape
                </button>
              </div>
              {mixtape.dedicatedTo && (
                <p style={{ marginBottom: '16px', fontStyle: 'italic' }}>For {mixtape.dedicatedTo}</p>
              )}

              <div style={{ maxWidth: '320px', marginBottom: '24px' }}>
                <CassetteSVG title={mixtape.title} side="A" float={false} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <ReadOnlySide label="Side A" songs={mixtape.sideA} />
                <ReadOnlySide label="Side B" songs={mixtape.sideB} />
              </div>
            </section>
          </div>
        )}
      </div>
      <HomeFooter />
    </div>
  );
};

export default PublicMixtapePage;
