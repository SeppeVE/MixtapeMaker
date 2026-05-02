import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mixtape, Song, Side } from '../types';
import NavBar from '../components/ui/NavBar';
import Floaters from '../components/ui/Floaters';
import SearchBar from '../components/ui/SearchBar';
import TapeSide from '../components/tape/TapeSide';
import TapePreview from '../components/tape/TapePreview';
import '../styles/Editor.css';

interface EditorPageProps {
  mixtape: Mixtape;
  onMixtapeChange: (mixtape: Mixtape) => void;
  isSaving: boolean;
  onSave: () => void;
  onNewMixtape: () => void;
  onOpenAuth: () => void;
  onOpenLibrary: () => void;
}

const EditorPage = ({
  mixtape,
  onMixtapeChange,
  isSaving,
  onSave,
  onNewMixtape,
  onOpenAuth,
  onOpenLibrary,
}: EditorPageProps) => {
  const navigate = useNavigate();

  const [sideA, setSideA] = useState(true);
  const [flipping, setFlipping] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const activeSide: Side = sideA ? 'A' : 'B';
  const activeSongs = sideA ? mixtape.sideA : mixtape.sideB;
  const maxDuration = (mixtape.cassetteLength / 2) * 60;

  const update = (patch: Partial<Mixtape>) =>
    onMixtapeChange({ ...mixtape, ...patch, updatedAt: new Date().toISOString() });

  const doFlip = useCallback(() => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => setSideA(s => !s), 240);
    setTimeout(() => setFlipping(false), 480);
  }, [flipping]);

  const handleAddSong = (song: Song, side: Side) => {
    const key = side === 'A' ? 'sideA' : 'sideB';
    update({ [key]: [...mixtape[key], song] });
  };

  const handleRemoveSong = (songId: string, side: Side) => {
    const key = side === 'A' ? 'sideA' : 'sideB';
    update({ [key]: mixtape[key].filter(s => s.id !== songId) });
  };

  const handleReorderSongs = (side: Side, songs: Song[]) => {
    update({ [side === 'A' ? 'sideA' : 'sideB']: songs });
  };

  const handleMoveSong = (songId: string, fromSide: Side, toSide: Side) => {
    const fromKey = fromSide === 'A' ? 'sideA' : 'sideB';
    const toKey   = toSide  === 'A' ? 'sideA' : 'sideB';
    const song = mixtape[fromKey].find(s => s.id === songId);
    if (!song) return;
    onMixtapeChange({
      ...mixtape,
      [fromKey]: mixtape[fromKey].filter(s => s.id !== songId),
      [toKey]:   [...mixtape[toKey], song],
      updatedAt: new Date().toISOString(),
    });
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
    if (trimmed) update({ title: trimmed });
    setIsEditingTitle(false);
  };

  return (
    <div className={`editor editor-side-${sideA ? 'a' : 'b'}${flipping ? ' flipping' : ''}`}>
      <Floaters sideA={sideA} />

      <NavBar
        onGoHome={() => navigate('/')}
        onOpenAuth={onOpenAuth}
        onOpenLibrary={onOpenLibrary}
        onSave={onSave}
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
            onKeyDown={e => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') setIsEditingTitle(false);
            }}
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
            onAddSong={handleAddSong}
            sideA={mixtape.sideA}
            sideB={mixtape.sideB}
            activeSide={activeSide}
          />
        </div>

        <div className="col-deck">
          <div className="deck-toolbar">
            <button
              className={`deck-side-label deck-side-label-${sideA ? 'a' : 'b'}`}
              onClick={doFlip}
              title={`Flip to Side ${sideA ? 'B' : 'A'}`}
            >
              ▸ Side {activeSide}
            </button>
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
            onUpdate={patch => update(patch)}
            onSave={onSave}
            onNewMixtape={onNewMixtape}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
