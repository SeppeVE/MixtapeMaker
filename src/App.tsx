import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import NavBar from './components/ui/NavBar';
import Toast from './components/ui/Toast';
import JCardView from './components/jcard/JCardView';
import JCardLibrary from './pages/JCardLibrary';
import './styles/App.css';
import './styles/Editor.css';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '';

function App() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  // Persist to localStorage on every change
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
    navigate('/editor');
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
    setSideA(true);
    navigate('/editor');
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

  const openDesigner = (card: JCard | null) => { setActiveCard(card); navigate('/cards/designer'); };
  const showToast = (msg: string, type: 'success' | 'error' | 'info') => setToast({ message: msg, type });

  return (
    <>
      <Routes>

        {/* ── Home ── */}
        <Route path="/" element={
          <HomePage
            onNewMixtape={handleNewMixtape}
            onLoadMixtape={handleLoadMixtape}
            onOpenLibrary={() => navigate('/library')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenJCards={() => navigate('/library')}
          />
        } />

        {/* ── Library ── */}
        <Route path="/library" element={
          <LibraryPage
            currentDraft={mixtape}
            onLoadMixtape={handleLoadMixtape}
            onSaveDraftToCloud={handleSave}
            isSavingDraft={isSaving}
            onGoHome={() => navigate('/')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenCard={openDesigner}
            onNewCard={() => openDesigner(null)}
            onNewMixtape={handleNewMixtape}
            showToast={showToast}
          />
        } />

        {/* ── Editor ── */}
        <Route path="/editor" element={
          <div className={`editor editor-side-${sideA ? 'a' : 'b'}${flipping ? ' flipping' : ''}`}>
            <Floaters sideA={sideA} />

            <NavBar
              onGoHome={() => navigate('/')}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onOpenLibrary={() => navigate('/library')}
              onSave={handleSave}
              isSaving={isSaving}
            >
              <button className="lp-nav-link" onClick={() => navigate(-1)}>◀ Back</button>
              <span className="lp-nav-sep">/</span>
              {isEditingTitle ? (
                <input
                  className="lp-nav-title-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
                  autoFocus
                />
              ) : (
                <button
                  className={`lp-nav-title${mixtape.title === 'Untitled Mixtape' ? ' lp-nav-title--untitled' : ''}`}
                  onClick={startEditTitle}
                  title="Click to rename"
                >
                  {mixtape.title}
                </button>
              )}
            </NavBar>

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
                  <button className={`deck-side-label deck-side-label-${sideA ? 'a' : 'b'}`} onClick={doFlip} title={`Flip to Side ${sideA ? 'B' : 'A'}`}>▸ Side {activeSide}</button>
                  <div className="deck-toolbar-spacer" />
                  <button className="btn deck-tool-btn" onClick={handleShuffle} title="Shuffle this side">⤨ Shuffle</button>
                  <button className="btn deck-tool-btn" onClick={doFlip} title="Flip tape">↻ Flip</button>
                </div>
                <TapeSide
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
          </div>
        } />

        {/* ── J-Card library ── */}
        <Route path="/cards" element={
          <div className="editor editor-side-a" style={{ overflowY: 'auto' }}>
            <NavBar
              onGoHome={() => navigate('/')}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            >
              <button className="lp-nav-link" onClick={() => navigate(-1)}>◀ Back</button>
              <span className="lp-nav-sep">/</span>
              <span className="lp-nav-link" style={{ cursor: 'default', opacity: 1, color: 'var(--color-text)' }}>
                🎴 J-Cards
              </span>
            </NavBar>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <JCardLibrary
                onOpenCard={openDesigner}
                onNewCard={() => openDesigner(null)}
                showToast={showToast}
              />
            </div>
          </div>
        } />

        {/* ── J-Card designer ── */}
        <Route path="/cards/designer" element={
          <div className="editor editor-side-a" style={{ overflowY: 'auto' }}>
            <NavBar
              onGoHome={() => navigate('/')}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            >
              <button className="lp-nav-link" onClick={() => navigate(-1)}>◀ Back</button>
              <span className="lp-nav-sep">/</span>
              <span className="lp-nav-link" style={{ cursor: 'default', opacity: 1, color: 'var(--color-text)' }}>
                Designer
              </span>
            </NavBar>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <JCardView
                initialCard={activeCard}
                currentMixtape={mixtape}
                onBack={() => navigate('/cards')}
                showToast={showToast}
              />
            </div>
          </div>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      {/* Shared modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export default App;
