import { useState, useEffect } from 'react';
import { Mixtape } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadMixtapes } from '../utils/database';
import Floaters from '../components/ui/Floaters';
import '../styles/HomePage.css';

interface HomePageProps {
  onNewMixtape: () => void;
  onLoadMixtape: (mixtape: Mixtape) => void;
  onOpenLibrary: () => void;
  onOpenAuth: () => void;
}

const HomePage = ({ onNewMixtape, onLoadMixtape, onOpenLibrary, onOpenAuth }: HomePageProps) => {
  const { user, signOut } = useAuth();
  const [recentTapes, setRecentTapes] = useState<Mixtape[]>([]);

  useEffect(() => {
    if (!user) { setRecentTapes([]); return; }
    loadMixtapes(user.id)
      .then(tapes => setRecentTapes(tapes.slice(0, 3)))
      .catch(() => {});
  }, [user]);

  return (
    <div className="homepage">
      <Floaters sideA={true} />

      <div className="home-nav">
        <span className="home-nav-logo">🅼 Cassette</span>
        <div className="home-nav-spacer" />
        {user ? (
          <>
            <span className="home-nav-user">●● {user.email?.split('@')[0]}</span>
            <button className="btn" onClick={signOut}>Sign Out</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onOpenAuth}>Sign In</button>
        )}
      </div>

      <div className="home-content">
        <div className="home-hero">
          <div className="home-title-box">
            <div className="home-title-label">
              <span>◈ SIDE A / SIDE B ◈</span>
              <span className="home-title-label-dots">● ● ●</span>
            </div>
            <div className="home-title-body">
              <div className="home-title-text">CASSETTE</div>
              <div className="home-title-sub">mixtape maker</div>
            </div>
          </div>

          <p className="home-tagline">
            Build the perfect mix tape. Drag in songs from Spotify,
            arrange both sides, and capture a moment in time.
          </p>

          <div className="home-cta">
            <button className="btn btn-primary" onClick={onNewMixtape}>
              ▶ New Tape
            </button>
            {user && (
              <button className="btn" onClick={onOpenLibrary}>
                ◀ Library
              </button>
            )}
          </div>
        </div>

        {user && recentTapes.length > 0 && (
          <div className="home-recent">
            <div className="home-recent-heading">⌯ Recent Tapes</div>
            <div className="home-tape-row">
              {recentTapes.map(tape => (
                <div
                  key={tape.id}
                  className="home-tape-card"
                  onClick={() => onLoadMixtape(tape)}
                >
                  <div className="home-tape-card-top">
                    <span className="home-tape-card-title">{tape.title}</span>
                    <span className="home-tape-card-len">C{tape.cassetteLength}</span>
                  </div>
                  <div className="home-tape-card-body">
                    <div className="home-tape-card-tracks">
                      A · {tape.sideA.length} trk<br />
                      B · {tape.sideB.length} trk
                    </div>
                  </div>
                  <div className="home-tape-card-footer">
                    <span className="home-tape-card-action">▶ Load</span>
                    <span className="home-tape-card-date">
                      {new Date(tape.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <div className="home-auth-nudge">
            ◌ Sign in to save and revisit your tapes
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
