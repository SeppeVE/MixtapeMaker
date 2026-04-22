import { useState } from 'react';
import { Song, Side } from '../types';
import {
  formatTime,
  calculateTotalDuration,
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

const TapeSide = ({ side, songs, maxDuration, onRemoveSong, onReorderSongs, onMoveSong }: TapeSideProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const totalDuration = calculateTotalDuration(songs);
  const pct = Math.min(1, totalDuration / maxDuration);
  const over = totalDuration > maxDuration;
  const remDur = Math.max(0, maxDuration - totalDuration);
  const deadAir = !over && remDur > maxDuration * 0.15;
  const otherSide: Side = side === 'A' ? 'B' : 'A';

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSongs = [...songs];
    const [dragged] = newSongs.splice(draggedIndex, 1);
    newSongs.splice(index, 0, dragged);
    setDraggedIndex(index);
    onReorderSongs(side, newSongs);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  return (
    <div className="tape-side" data-side={side}>
      {/* Window title bar */}
      <div className="tape-side-header">
        <span className="side-title">⚏ The Deck · Side {side}</span>
        <div className={`time-info${over ? ' over-limit' : ''}`}>
          <span>{songs.length} trk · {formatTime(totalDuration)}</span>
          {over && <span className="time-warning"> ⚠ +{formatTime(totalDuration - maxDuration)}</span>}
        </div>
      </div>

      {/* Song list */}
      <div className="song-list">
        {songs.length === 0 ? (
          <div className="empty-side">◌ drop a song here · or press A / B from search</div>
        ) : (
          songs.map((song, index) => (
            <div
              key={`${song.id}-${index}`}
              className={`song-item${draggedIndex === index ? ' dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="song-number">
                {String(index + 1).padStart(2, '0')}
              </div>
              {song.albumCover && (
                <img src={song.albumCover} alt={song.album} className="song-artwork" />
              )}
              <div className="song-details">
                <div className="song-item-title">{song.title}</div>
                <div className="song-item-artist">{song.artist} · {formatTime(song.duration)}</div>
              </div>
              <div className="fade-knob" title="Fade / gap">↘0s</div>
              <div className="song-actions">
                <button
                  onClick={() => onMoveSong(song.id, side, otherSide)}
                  className="btn-icon"
                  title={`Move to Side ${otherSide}`}
                >↔</button>
                <button
                  onClick={() => onRemoveSong(song.id, side)}
                  className="btn-icon btn-remove"
                  title="Remove"
                >×</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tape meter footer */}
      <div className="tape-meter-footer">
        <div className="tape-meter-status">
          <span>{songs.length} tracks · {formatTime(totalDuration)}</span>
          <span className={over ? 'meter-over' : deadAir ? 'meter-deadair' : 'meter-ok'}>
            {over
              ? `⚠ OVER by ${formatTime(totalDuration - maxDuration)}`
              : deadAir
              ? `⌯ ${formatTime(remDur)} dead air`
              : `◷ ${formatTime(remDur)} left`}
          </span>
        </div>
        <div className="tape-meter-bar">
          <div
            className={`tape-meter-fill${over ? ' fill-over' : ''}`}
            style={{ width: `${pct * 100}%` }}
          />
          <div className="tape-meter-ticks">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="tape-meter-tick" />
            ))}
            <div className="tape-meter-tick-last" />
          </div>
        </div>
        <div className="tape-meter-labels">
          <span>C30</span><span>C45</span><span>C60</span><span>C90</span>
        </div>
      </div>
    </div>
  );
};

export default TapeSide;
