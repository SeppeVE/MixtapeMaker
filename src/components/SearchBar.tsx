import { useState } from 'react';
import { Song, Side } from '../types';
import { searchSpotify } from '../utils/spotify';
import { formatTime, wouldExceedLimit } from '../utils/timeUtils';
import '../../assets/styles/SearchBar.css';

interface SearchBarProps {
  clientId: string;
  clientSecret: string;
  onAddSong: (song: Song, side: Side) => void;
  cassetteLength: number;
  sideA: Song[];
  sideB: Song[];
}

const SearchBar = ({
  clientId,
  clientSecret,
  onAddSong,
  cassetteLength,
  sideA,
  sideB,
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDurationPerSide = (cassetteLength / 2) * 60; // Convert to seconds

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const songs = await searchSpotify(query, clientId, clientSecret);
      setResults(songs);
    } catch (err) {
      setError('Failed to search. Please check your Spotify credentials.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToSide = (song: Song, side: Side) => {
    const currentSongs = side === 'A' ? sideA : sideB;
    const willExceed = wouldExceedLimit(currentSongs, song, maxDurationPerSide);

    if (willExceed) {
      const proceed = confirm(
        `Adding this song will exceed the ${
          cassetteLength / 2
        } minute limit for Side ${side}. Add anyway?`
      );
      if (!proceed) return;
    }

    onAddSong(song, side);
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs..."
          className="search-input"
        />
        <button type="submit" disabled={isLoading} className="btn btn-search">
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((song) => (
            <div key={song.id} className="search-result-item">
              <img
                src={song.albumCover}
                alt={song.album}
                className="album-cover-small"
              />
              <div className="song-info">
                <div className="song-title">{song.title}</div>
                <div className="song-artist">{song.artist}</div>
                <div className="song-duration">{formatTime(song.duration)}</div>
              </div>
              <div className="add-buttons">
                <button
                  onClick={() => handleAddToSide(song, 'A')}
                  className="btn btn-add"
                  title="Add to Side A"
                >
                  + A
                </button>
                <button
                  onClick={() => handleAddToSide(song, 'B')}
                  className="btn btn-add"
                  title="Add to Side B"
                >
                  + B
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !isLoading && !error && (
        <div className="empty-state">
          Start searching for songs to add to your mixtape
        </div>
      )}
    </div>
  );
};

export default SearchBar;
