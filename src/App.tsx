import { useState, useEffect, useCallback } from 'react';
import { Mixtape, CassetteLength, Song, Side, JCard } from './types';
import { generateId } from './utils/timeUtils';
import { saveMixtapeToLocal, loadMixtapeFromLocal } from './utils/localStorage';
import { saveMixtape } from './utils/database';
import { useAuth } from './contexts/AuthContext';
import SearchBar from './components/ui/SearchBar';
import TapeSide from './components/tape/TapeSide';
import TapePreview from './components/tape/TapePreview';
import Floaters from './components/ui/Floaters';
import AuthModal from './components/auth/AuthModal';
import Library from './pages/Library';
import HomePage from './pages/HomePage';
import Toast from './components/ui/Toast';
import JCardView from './components/jcard/JCardView';
import JCardLibrary from './pages/JCardLibrary';
import './styles/App.css';
import './styles/Editor.css';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '';

type AppView = 'home' | 'editor' | 'cards' | 'jcard';

function App() {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<AppView>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sideA, setSideA] = useState(true);
  const [flipping, setFlipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [activeCard, setActiveCard] = useState<JCard | null>(null);

  const [mixtape, setMixtape] = useState<Mixtape>(() => {
    return loadMixtapeFromLocal() || {
      id: generateId(),
      title: 'Untitled Mixtape',
      cassetteLength: 90 as CassetteLength,
      sideA: [],
      sideB: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  useEffect(() => { saveMixtapeToLocal(mixtape); }, [mixtape]);

  const activeSide: Side = sideA ? 'A' : 'B';
  const activeSongs = sideA ? mixtape.sideA : mixtape.sideB;
  const maxDuration = (mixtape.cassetteLength / 2) * 60;

  const doFlip = useCallback(() => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => setSideA(s => !s), 240);
    setTimeout(() => setFlipping(false), 480);
  }, [flipping]);

  const handleAddSong = (song: Song, side: Side) => {
    setMixtape(prev => ({
      ...prev,
      [side === 'A' ? 'sideA' : 'sideB']: [...prev[side === 'A' ? 'sideA' : 'sideB'], song],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveSong = (songId: string, side: Side) => {
    setMixtape(prev => ({
      ...prev,
      [side === 'A' ? 'sideA' : 'sideB']: prev[side === 'A' ? 'sideA' : 'sideB'].filter(s => s.id !== songId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleReorderSongs = (side: Side, songs: Song[]) => {
    setMixtape(prev => ({ ...prev, [side === 'A' ? 'sideA' : 'sideB']: songs, updatedAt: new Date().toISOString() }));
  };

  const handleMoveSong = (songId: string, fromSide: Side, toSide: Side) => {
    const fromKey = fromSide === 'A' ? 'sideA' : 'sideB';
    const toKey   = toSide === 'A' ? 'sideA' : 'sideB';
    const song = mixtape[fromKey].find(s => s.id === songId);
    if (!song) return;
    setMixtape(prev => ({
      ...prev,
      [fromKey]: prev[fromKey].filter(s => s.id !== songId),
      [toKey]: [...prev[toKey], song],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleMixtapeUpdate = (updates: Partial<Mixtape>) => {
    setMixtape(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  };

  const handleNewMixtape = () => {
    setMixtape({ id: generateId(), title: 'Untitled Mixtape', cassetteLength: 90 as CassetteLength, sideA: [], sideB: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setSideA(true);
    setView('editor');
    setToast({ message: 'New mixtape created', type: 'success' });
  };

  const handleSave = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsSaving(true);
    try {
      await saveMixtape(mixtape, user.id);
      setToast({ message: 'Mixtape saved to cloud', type: 'success' });
    } catch (error) {
      console.error('Failed to save mixtape:', error);
      setToast({ message: 'Failed to save mixtape', type: 'error' });
    } finally { setIsSaving(false); }
  };

  const handleLoadMixtape = (loaded: Mixtape) => {
    setMixtape(loaded);
    setIsLibraryOpen(false);
    setSideA(true);
    setView('editor');
    setToast({ message: 'Mixtape loaded', type: 'success' });
  };

  const handleShuffle = () => {
    const songs = [...activeSongs];
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }
    handleReorderSongs(activeSide, songs);
  };

  const startEditTitle = () => { setEditTitle(mixtape.title); setIsEditingTitle(true); };
  const saveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed) handleMixtapeUpdate({ title: trimmed });
    setIsEditingTitle(false);
  };

  const openDesigner = (card: JCard | null) => { setActiveCard(card); setView('jcard'); };
  const showToast = (msg: string, type: 'success' | 'error' | 'info') => setToast({ message: msg, type });

  // ── Home ──────────────────────────────────────────────────────────────────
  if (view === 'home') {
    return (
      <>
        <HomePage
          onNewMixtape={handleNewMixtape}
          onLoadMixtape={handleLoadMixtape}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenJCards={() => setView('cards')}
        />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <Library isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onLoadMixtape={handleLoadMixtape} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── J-Card library / designer — full-page overlay ─────────────────────────
  if (view === 'cards' || view === 'jcard') {
    return (
      <div className="editor editor-side-a" style={{ overflowY: 'auto' }}>
        <div className="menubar">
          <button className="menubar-link menubar-logo" onClick={() => setView('home')}>🅼</button>
          <button className="menubar-link" onClick={() => setView('editor')}>◀ Editor</button>
          <span className="menubar-sep">/</span>
          <span className="menubar-title" style={{ cursor: 'default' }}>
            {view === 'jcard' ? '🎴 Designer' : '🎴 J-Cards'}
          </span>
          <div className="menubar-spacer" />
          {user && <span className="menubar-user">●● {user.email?.split('@')[0]}</span>}
          {user
            ? <button className="menubar-link" onClick={signOut}>Sign Out</button>
            : <button className="menubar-save" onClick={() => setIsAuthModalOpen(true)}>Sign In</button>
          }
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {view === 'cards' && (
            <JCardLibrary
              onOpenCard={openDesigner}
              onNewCard={() => openDesigner(null)}
              showToast={showToast}
            />
          )}
          {view === 'jcard' && (
            <JCardView
              initialCard={activeCard}
              currentMixtape={mixtape}
              onBack={() => setView('cards')}
              showToast={showToast}
            />
          )}
        </div>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div className={`editor editor-side-${sideA ? 'a' : 'b'}${flipping ? ' flipping' : ''}`}>
      <Floaters sideA={sideA} />

      <div className="menubar">
        <button className="menubar-link menubar-logo" onClick={() => setView('home')}>🅼</button>
        <button className="menubar-link" onClick={() => setIsLibraryOpen(true)}>◀ Library</button>
        <span className="menubar-sep">/</span>
        {isEditingTitle ? (
          <input
            className="menubar-title-input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
            autoFocus
          />
        ) : (
          <span className="menubar-title" onClick={startEditTitle}>
            {mixtape.title}<span className="menubar-cursor" />
          </span>
        )}
        <div className="menubar-spacer" />
        {/* J-Card button */}
        <button className="menubar-link" onClick={() => setView('cards')}>🎴 J-Cards</button>
        <span className="menubar-sep">/</span>
        {user && <span className="menubar-user">●● {user.email?.split('@')[0]}</span>}
        {user ? (
          <>
            <button className="menubar-save" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button className="menubar-link" onClick={signOut}>Sign Out</button>
          </>
        ) : (
          <button className="menubar-save" onClick={() => setIsAuthModalOpen(true)}>Sign In</button>
        )}
      </div>

      <div className="workspace">
        <div className="col-search">
          <div className="col-hello">Search</div>
          <SearchBar
            clientId={SPOTIFY_CLIENT_ID}
            clientSecret={SPOTIFY_CLIENT_SECRET}
            onAddSong={handleAddSong}
            sideA={mixtape.sideA}
            sideB={mixtape.sideB}
            activeSide={activeSide}
          />
        </div>

        <div className="col-deck">
          <div className="deck-toolbar">
            <div className={`deck-side-label deck-side-label-${sideA ? 'a' : 'b'}`}>▸ Side {activeSide}</div>
            <div className="deck-toolbar-spacer" />
            <button className="btn deck-tool-btn" onClick={handleShuffle} title="Shuffle this side">⤨ Shuffle</button>
            <button className="btn deck-tool-btn" onClick={doFlip} title="Flip tape">↻ Flip</button>
            <div className="side-toggle">
              <button className={`side-toggle-btn${sideA ? ' active' : ''}`} onClick={() => !sideA && doFlip()}>A</button>
              <button className={`side-toggle-btn${!sideA ? ' active' : ''}`} onClick={() => sideA && doFlip()}>B</button>
            </div>
          </div>
          <TapeSide
            key={activeSide}
            side={activeSide}
            songs={activeSongs}
            maxDuration={maxDuration}
            onRemoveSong={handleRemoveSong}
            onReorderSongs={handleReorderSongs}
            onMoveSong={handleMoveSong}
          />
        </div>

        <div className="col-preview">
          <TapePreview
            mixtape={mixtape}
            sideA={sideA}
            isSaving={isSaving}
            onUpdate={handleMixtapeUpdate}
            onSave={handleSave}
            onNewMixtape={handleNewMixtape}
          />
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <Library isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onLoadMixtape={handleLoadMixtape} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
