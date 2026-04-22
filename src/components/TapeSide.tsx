import { useState } from 'react';
import { Song, Side } from '../types';
import {
  formatTime,
  calculateTotalDuration,
  calculateRemainingTime,
} from '../utils/timeUtils';
import '../../assets/styles/TapeSide.css';

interface TapeSideProps {
  side: Side;
  songs: Song[];
  maxDuration: number;
  onRemoveSong: (songId: string, side: Side) => void;
  onReorderSongs: (side: Side, songs: Song[]) => void;
  onMoveSong: (songId: string, fromSide: Side, toSide: Side) => void;
}

const TapeSide = ({
  side,
  songs,
  maxDuration,
  onRemoveSong,
  onReorderSongs,
  onMoveSong,
}: TapeSideProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const totalDuration = calculateTotalDuration(songs);
  const remainingTime = calculateRemainingTime(songs, maxDuration);
  const isOverLimit = totalDuration > maxDuration;
  const otherSide = side === 'A' ? 'B' : 'A';

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSongs = [...songs];
    const draggedSong = newSongs[draggedIndex];
    newSongs.splice(draggedIndex, 1);
    newSongs.splice(index, 0, draggedSong);

    setDraggedIndex(index);
    onReorderSongs(side, newSongs);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="tape-side">
      <div className="tape-side-header">
        <h2 className="side-title">SIDE {side}</h2>
        <div className={`time-info ${isOverLimit ? 'over-limit' : ''}`}>
          <span className="time-used">{formatTime(totalDuration)}</span>
          <span className="time-separator"> / </span>
          <span className="time-max">{formatTime(maxDuration)}</span>
          {isOverLimit && (
            <span className="warning"> ⚠ Over limit!</span>
          )}
        </div>
      </div>

      <div className="stripe"></div>

      <div className="song-list">
        {songs.length === 0 ? (
          <div className="empty-side">Add songs to Side {side}</div>
        ) : (
          songs.map((song, index) => (
            <div
              key={`${song.id}-${index}`}
              className="song-item"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="song-number">{index + 1}.</div>
              {song.albumCover && (
                <img
                  src={song.albumCover}
                  alt={song.album}
                  className="song-artwork"
                />
              )}
              <div className="song-details">
                <div className="song-item-title">{song.title}</div>
                <div className="song-item-artist">
                  {song.artist} · {formatTime(song.duration)}
                </div>
              </div>
              <div className="song-actions">
                <button
                  onClick={() => onMoveSong(song.id, side, otherSide)}
                  className="btn-icon"
                  title={`Move to Side ${otherSide}`}
                >
                  ↔
                </button>
                <button
                  onClick={() => onRemoveSong(song.id, side)}
                  className="btn-icon btn-remove"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="stripe"></div>

      <div className="tape-side-footer">
        <div className="remaining-time">
          Remaining: {formatTime(Math.max(0, remainingTime))}
        </div>
      </div>
    </div>
  );
};

export default TapeSide;
