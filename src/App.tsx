import { useState, useEffect } from 'react';
import { Mixtape, CassetteLength, Song, Side } from './types';
import { generateId } from './utils/timeUtils';
import {
  saveMixtapeToLocal,
  loadMixtapeFromLocal,
} from './utils/localStorage';
import { saveMixtape } from './utils/database';
import { useAuth } from './contexts/AuthContext';
import SearchBar from './components/SearchBar';
import CassetteTape from './components/CassetteTape';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import Library from './components/Library';
import Toast from './components/Toast';
import '../assets/styles/App.css';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '';

function App() {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [mixtape, setMixtape] = useState<Mixtape>(() => {
    const saved = loadMixtapeFromLocal();
    return (
      saved || {
        id: generateId(),
        title: 'Untitled Mixtape',
        cassetteLength: 90,
        sideA: [],
        sideB: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  });

  // Auto-save to local storage whenever mixtape changes
  useEffect(() => {
    saveMixtapeToLocal(mixtape);
  }, [mixtape]);

  const handleAddSong = (song: Song, side: Side) => {
    setMixtape((prev) => ({
      ...prev,
      [side === 'A' ? 'sideA' : 'sideB']: [
        ...prev[side === 'A' ? 'sideA' : 'sideB'],
        song,
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveSong = (songId: string, side: Side) => {
    setMixtape((prev) => ({
      ...prev,
      [side === 'A' ? 'sideA' : 'sideB']: prev[
        side === 'A' ? 'sideA' : 'sideB'
      ].filter((s) => s.id !== songId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleReorderSongs = (side: Side, songs: Song[]) => {
    setMixtape((prev) => ({
      ...prev,
      [side === 'A' ? 'sideA' : 'sideB']: songs,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleMoveSong = (songId: string, fromSide: Side, toSide: Side) => {
    const fromKey = fromSide === 'A' ? 'sideA' : 'sideB';
    const toKey = toSide === 'A' ? 'sideA' : 'sideB';

    const song = mixtape[fromKey].find((s) => s.id === songId);
    if (!song) return;

    setMixtape((prev) => ({
      ...prev,
      [fromKey]: prev[fromKey].filter((s) => s.id !== songId),
      [toKey]: [...prev[toKey], song],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCassetteLengthChange = (length: CassetteLength) => {
    setMixtape((prev) => ({
      ...prev,
      cassetteLength: length,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleTitleChange = (title: string) => {
    setMixtape((prev) => ({
      ...prev,
      title,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleNewMixtape = () => {
    const newMixtape: Mixtape = {
      id: generateId(),
      title: 'Untitled Mixtape',
      cassetteLength: 90,
      sideA: [],
      sideB: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMixtape(newMixtape);
    setToast({ message: 'New mixtape created', type: 'success' });
  };

  const handleSave = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      await saveMixtape(mixtape, user.id);
      setToast({ message: 'Mixtape saved to cloud', type: 'success' });
    } catch (error) {
      console.error('Failed to save mixtape:', error);
      setToast({ message: 'Failed to save mixtape', type: 'error' });
    }
  };

  const handleLoadMixtape = (loadedMixtape: Mixtape) => {
    setMixtape(loadedMixtape);
    setIsLibraryOpen(false);
    setToast({ message: 'Mixtape loaded', type: 'success' });
  };

  return (
    <div className="app">
      <Header
        title={mixtape.title}
        onTitleChange={handleTitleChange}
        onNewMixtape={handleNewMixtape}
        onSave={handleSave}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <SearchBar
        clientId={SPOTIFY_CLIENT_ID}
        clientSecret={SPOTIFY_CLIENT_SECRET}
        onAddSong={handleAddSong}
        cassetteLength={mixtape.cassetteLength}
        sideA={mixtape.sideA}
        sideB={mixtape.sideB}
      />

      <CassetteTape
        mixtape={mixtape}
        onRemoveSong={handleRemoveSong}
        onReorderSongs={handleReorderSongs}
        onMoveSong={handleMoveSong}
        onCassetteLengthChange={handleCassetteLengthChange}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <Library
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onLoadMixtape={handleLoadMixtape}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;