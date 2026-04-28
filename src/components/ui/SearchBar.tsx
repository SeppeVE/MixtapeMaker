import { useState } from 'react';
import { Song, Side } from '../../types';
import { searchSpotify } from '../../utils/spotify';
import { formatTime } from '../../utils/timeUtils';
import '../../styles/SearchBar.css';

interface SearchBarProps {
  clientId: string;
  clientSecret: string;
  onAddSong: (song: Song, side: Side) => void;
  sideA: Song[];
  sideB: Song[];
  activeSide: Side;
}

const SearchBar = ({ clientId, clientSecret, onAddSong, sideA, sideB, activeSide }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const songs = await searchSpotify(q, clientId, clientSecret);
      setResults(songs);
      setRecentSearches(prev => {
        const next = [q, ...prev.filter(r => r !== q)].slice(0, 4);
        return next;
      });
    } catch (err) {
      setError('Search failed. Check your Spotify credentials.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="search-bar">
      <div className="search-window">
        <div className="search-window-title">♪ Spotify</div>

        <div className="search-form-area">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="song, artist… ( / )"
              className="search-input"
            />
            <button type="submit" disabled={isLoading} className="btn btn-search">
              {isLoading ? '…' : '⌕'}
            </button>
          </form>

          {recentSearches.length > 0 && (
            <div className="recent-chips">
              {recentSearches.map(r => (
                <span key={r} className="recent-chip" onClick={() => { setQuery(r); runSearch(r); }}>
                  ↺ {r}
                </span>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="search-status">
              {results.length} results · <span className="connected">● spotify</span>
            </div>
          )}

          {error && <div className="search-error">{error}</div>}
        </div>

        <div className="search-results">
          {results.length === 0 && !isLoading && !error && (
            <div className="search-empty">search for songs to add to your tape</div>
          )}
          {results.map(song => {
            const onA = sideA.some(s => s.id === song.id);
            const onB = sideB.some(s => s.id === song.id);
            const onTape = onA || onB;
            return (
              <SearchResult
                key={song.id}
                song={song}
                onA={onA}
                onB={onB}
                onTape={onTape}
                activeSide={activeSide}
                onAdd={onAddSong}
              />
            );
          })}
        </div>

        <div className="search-hints">
          <span><kbd className="hint-kbd">⏎</kbd> add to {activeSide}</span>
          <span><kbd className="hint-kbd">⇧⏎</kbd> other side</span>
        </div>
      </div>
    </div>
  );
};

interface SearchResultProps {
  song: Song;
  onA: boolean;
  onB: boolean;
  onTape: boolean;
  activeSide: Side;
  onAdd: (song: Song, side: Side) => void;
}

function SearchResult({ song, onA, onB, onTape, activeSide, onAdd }: SearchResultProps) {
  return (
    <div className={`search-result-item${onTape ? ' on-tape' : ''}`}>
      {song.albumCover ? (
        <img src={song.albumCover} alt={song.album} className="album-cover-small" />
      ) : (
        <div className="album-cover-small album-cover-placeholder" />
      )}
      <div className="song-info">
        <div className="song-title">{song.title}</div>
        <div className="song-meta">
          <span>{song.artist} · {formatTime(song.duration)}</span>
          {onA && <span className="on-tape-badge on-tape-badge-a">✓ A</span>}
          {onB && <span className="on-tape-badge on-tape-badge-b">✓ B</span>}
        </div>
      </div>
      <div className="add-buttons">
        <button
          className={`btn-side btn-side-a${activeSide === 'A' ? ' active-side' : ''}${onA ? ' on-tape' : ''}`}
          onClick={() => !onA && onAdd(song, 'A')}
          title={onA ? 'Already on Side A' : 'Add to Side A'}
        >A</button>
        <button
          className={`btn-side btn-side-b${activeSide === 'B' ? ' active-side' : ''}${onB ? ' on-tape' : ''}`}
          onClick={() => !onB && onAdd(song, 'B')}
          title={onB ? 'Already on Side B' : 'Add to Side B'}
        >B</button>
      </div>
    </div>
  );
}

export default SearchBar;
