import { Mixtape, Side, Song, CassetteLength } from '../../types';
import TapeSide from './TapeSide';
import '../../styles/CassetteTape.css';

interface CassetteTapeProps {
  mixtape: Mixtape;
  onRemoveSong: (songId: string, side: Side) => void;
  onReorderSongs: (side: Side, songs: Song[]) => void;
  onMoveSong: (songId: string, fromSide: Side, toSide: Side) => void;
  onCassetteLengthChange: (length: CassetteLength) => void;
}

const CassetteTape = ({
  mixtape,
  onRemoveSong,
  onReorderSongs,
  onMoveSong,
  onCassetteLengthChange,
}: CassetteTapeProps) => {
  const maxDurationPerSide = (mixtape.cassetteLength / 2) * 60; // in seconds

  return (
    <div className="cassette-container">
      <div className="cassette-controls">
        <label htmlFor="cassette-length">Cassette Length:</label>
        <select
          id="cassette-length"
          value={mixtape.cassetteLength}
          onChange={(e) =>
            onCassetteLengthChange(Number(e.target.value) as CassetteLength)
          }
          className="cassette-select"
        >
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>120 min</option>
        </select>
      </div>

      <div className="j-card">
        <TapeSide
          side="A"
          songs={mixtape.sideA}
          maxDuration={maxDurationPerSide}
          onRemoveSong={onRemoveSong}
          onReorderSongs={onReorderSongs}
          onMoveSong={onMoveSong}
        />
        <TapeSide
          side="B"
          songs={mixtape.sideB}
          maxDuration={maxDurationPerSide}
          onRemoveSong={onRemoveSong}
          onReorderSongs={onReorderSongs}
          onMoveSong={onMoveSong}
        />
      </div>
    </div>
  );
};

export default CassetteTape;
