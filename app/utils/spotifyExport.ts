import { Mixtape, Song } from '../types';
import { getStoredTokens, isTokenExpired, refreshAccessToken, SpotifyTokens } from './spotifyAuth';
import { generateCassetteCoverJpegBase64 } from './cassetteCoverImage';

export interface ExportResult {
  playlistUrl: string;
  playlistId: string;
  addedCount: number;
  skippedCount: number;
  skippedSongs: Song[];
}

const API = 'https://api.spotify.com/v1';

async function spotifyFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Spotify error ${res.status}`);
  }
  return res.json();
}

// The images endpoint takes a raw base64 JPEG body (not JSON) and returns 202
// with no body, so it can't go through spotifyFetch.
async function uploadPlaylistCover(playlistId: string, accessToken: string, base64Jpeg: string): Promise<void> {
  const res = await fetch(`${API}/playlists/${playlistId}/images`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'image/jpeg',
    },
    body: base64Jpeg,
  });
  if (!res.ok) throw new Error(`Spotify cover upload failed (${res.status})`);
}

export async function exportMixtapeToSpotify(mixtape: Mixtape): Promise<ExportResult> {
  let tokens: SpotifyTokens | null = getStoredTokens();
  if (!tokens) throw new Error('Not connected to Spotify');
  if (isTokenExpired()) tokens = await refreshAccessToken();

  const allSongs = [...mixtape.sideA, ...mixtape.sideB];
  const trackUris = allSongs.filter(s => s.spotifyUri).map(s => s.spotifyUri as string);
  const skippedSongs = allSongs.filter(s => !s.spotifyUri);

  const me = await spotifyFetch(`${API}/me`, tokens.accessToken);
  const userId: string = me.id;

  const playlist = await spotifyFetch(`${API}/users/${userId}/playlists`, tokens.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: mixtape.title,
      description: 'Exported from https://mixtape-maker.com',
      public: false,
    }),
  });

  const playlistId: string = playlist.id;
  const playlistUrl: string = playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlistId}`;

  let addedCount = 0;
  for (let i = 0; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    await spotifyFetch(`${API}/playlists/${playlistId}/tracks`, tokens.accessToken, {
      method: 'POST',
      body: JSON.stringify({ uris: batch }),
    });
    addedCount += batch.length;
  }

  // Cover art is best-effort: a failure here (rasterizing, or the upload itself,
  // e.g. because ugc-image-upload wasn't granted on an older connection) shouldn't
  // fail an otherwise-successful export.
  try {
    const cover = await generateCassetteCoverJpegBase64(mixtape);
    await uploadPlaylistCover(playlistId, tokens.accessToken, cover);
  } catch (err) {
    console.warn('Could not set Spotify playlist cover:', err);
  }

  return { playlistUrl, playlistId, addedCount, skippedCount: skippedSongs.length, skippedSongs };
}
