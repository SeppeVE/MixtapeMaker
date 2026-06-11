import { useState } from 'react';
import { Mixtape } from '../../types';
import { isAuthenticated, startSpotifyAuth, clearTokens } from '../../utils/spotifyAuth';
import { exportMixtapeToSpotify, ExportResult } from '../../utils/spotifyExport';

interface Props {
  mixtape: Mixtape;
}

type State = 'idle' | 'connecting' | 'exporting' | 'success' | 'error';

export default function ExportToSpotify({ mixtape }: Props) {
  const [connected, setConnected] = useState(isAuthenticated);
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = () => {
    clearTokens();
    setConnected(false);
    setState('idle');
    setResult(null);
  };

  const handleClick = async () => {
    if (!connected) {
      setState('connecting');
      try {
        await startSpotifyAuth();
      } catch {
        setState('error');
        setError('Could not start Spotify login. Check VITE_SPOTIFY_CLIENT_ID.');
      }
      return;
    }

    setState('exporting');
    setError(null);

    try {
      const res = await exportMixtapeToSpotify(mixtape);
      setResult(res);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setState('error');
    }
  };

  const busy = state === 'connecting' || state === 'exporting';
  const label = state === 'exporting'
    ? 'Exporting...'
    : state === 'connecting'
    ? 'Connecting...'
    : connected
    ? '⬆ Export to Spotify'
    : 'Connect Spotify';

  return (
    <div className="export-spotify">
      {state === 'success' && result ? (
        <div className="export-result">
          <a
            className="btn action-btn export-btn--success"
            href={result.playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Playlist ↗
          </a>
          {result.skippedCount > 0 && (
            <p className="export-skipped">
              {result.addedCount} added · {result.skippedCount} skipped (not on Spotify)
            </p>
          )}
        </div>
      ) : state === 'error' ? (
        <div className="export-result">
          <p className="export-error">{error}</p>
          <button className="btn action-btn" onClick={() => setState('idle')}>
            Retry
          </button>
        </div>
      ) : (
        <button className="btn action-btn" onClick={handleClick} disabled={busy}>
          {label}
        </button>
      )}

      <div className="export-spotify-status">
        <span className={`export-dot export-dot--${connected ? 'on' : 'off'}`} />
        <span className="export-status-label">
          {connected ? 'Spotify linked' : 'Not linked to Spotify'}
        </span>
        {connected && (
          <button className="export-disconnect" onClick={handleDisconnect}>
            disconnect
          </button>
        )}
      </div>
    </div>
  );
}
