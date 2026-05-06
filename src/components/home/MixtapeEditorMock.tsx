import '../../styles/mockComponents.css';

const MOCK_SONGS = [
  { title: 'Fade Into You',        artist: 'Mazzy Star',    dur: '3:35' },
  { title: 'Dreams',               artist: 'Fleetwood Mac', dur: '4:14' },
  { title: 'The Chain',            artist: 'Fleetwood Mac', dur: '4:30' },
  { title: 'Running Up That Hill', artist: 'Kate Bush',     dur: '5:02' },
];

const MixtapeEditorMock = () => (
  <div className="lp-mock-window lp-shadow-lg">
    {/* App-style title bar */}
    <div className="mock-title-bar">
      <div className="mock-close-btn">×</div>
      <span className="mock-nav-breadcrumb">◀ Library</span>
      <span className="mock-nav-separator">/</span>
      <span>Summer Drive '94</span>
      <div className="mock-spacer" />
      <span className="mock-save-btn">Save</span>
    </div>

    {/* Side header */}
    <div className="mock-side-header">
      <span className="mock-side-title">◀ SIDE A</span>
      <span className="mock-time-display">17:21 / 30:00</span>
    </div>

    {/* Song list */}
    <div className="mock-song-list">
      {MOCK_SONGS.map((song, i) => (
        <div key={i} className="mock-song-item">
          {/* Number tab */}
          <div className="mock-song-number">
            {i + 1}
            <div className="mock-song-corner" />
          </div>

          {/* Song info */}
          <div className="mock-song-content">
            <div className="mock-song-title">
              {song.title}
            </div>
            <div className="mock-song-artist">
              {song.artist}
            </div>
          </div>

          {/* Duration */}
          <div className="mock-song-duration">
            {song.dur}
          </div>
        </div>
      ))}

      {/* Ghost "add" row */}
      <div className="mock-song-add">
        <div className="mock-add-icon">+</div>
        <span className="mock-add-text">add a track…</span>
      </div>
    </div>

    {/* Tape meter footer */}
    <div className="mock-tape-footer">
      <div className="mock-tape-stats">
        <span className="mock-tape-used">Used: 17:21</span>
        <span className="mock-tape-free">12:39 free</span>
      </div>
      {/* Fill bar */}
      <div className="mock-tape-bar">
        <div className="mock-tape-fill" />
        <div className="mock-tape-grid">
          {[...Array(9)].map((_, j) => (
            <div key={j} className="mock-tape-grid-line" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default MixtapeEditorMock;
