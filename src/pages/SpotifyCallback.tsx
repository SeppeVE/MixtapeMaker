import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  storeTokens,
  getCodeVerifier,
  getReturnPath,
  getRedirectUri,
  clearAuthSession,
  SPOTIFY_CLIENT_ID,
} from '../utils/spotifyAuth';

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setError('Spotify authorization was denied.');
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      return;
    }

    const verifier = getCodeVerifier();
    const returnPath = getReturnPath();

    if (!verifier) {
      setError('Session expired. Please try connecting again.');
      return;
    }

    const redirectUri = getRedirectUri();

    fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      }),
    })
      .then(res => res.json())
      .then((data: { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string }) => {
        if (data.error || !data.access_token) {
          throw new Error(data.error_description ?? data.error ?? 'Failed to connect to Spotify');
        }
        storeTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? '',
          expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
        });
        clearAuthSession();
        navigate(returnPath, { replace: true });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to connect to Spotify');
      });
  }, [navigate]);

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'inherit' }}>
        <p style={{ marginBottom: '1rem', color: '#d4524a' }}>{error}</p>
        <button className="btn" onClick={() => navigate('/mixtape')}>
          Back to Editor
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'inherit' }}>
      <p>Connecting to Spotify...</p>
    </div>
  );
}
