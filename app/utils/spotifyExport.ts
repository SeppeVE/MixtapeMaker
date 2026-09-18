import { Mixtape, Song } from '../types';
import { getStoredTokens, hasImageUploadScope, isTokenExpired, refreshAccessToken, SpotifyTokens } from './spotifyAuth';
import { generateCassetteCoverJpegBase64 } from './cassetteCoverImage';

export interface ExportResult {
  playlistUrl: string;
  playlistId: string;
  addedCount: number;
  skippedCount: number;
  skippedSongs: Song[];
  /** False when the cassette cover couldn't be set — Spotify then shows its own auto-generated collage instead. */
  coverSet: boolean;
  /** Human-readable reason the cover wasn't set, when coverSet is false. */
  coverError?: string;
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
  if (!res.ok) {
    // This endpoint's error body is inconsistent (sometimes JSON, sometimes empty
    // or plain text), so fall back to the raw response text rather than a generic
    // status-only message — that text is what actually tells us why it failed.
    const raw = await res.text().catch(() => '');
    const parsed = (() => { try { return JSON.parse(raw) as { error?: { message?: string } }; } catch { return null; } })();
    const detail = parsed?.error?.message ?? raw;
    throw new Error(`Spotify cover upload failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
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
      description: 'Made with Mixtape Maker — https://mixtape-maker.com',
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

  // Cover art is best-effort: a failure here shouldn't fail an otherwise-successful
  // export, but it's surfaced in the result rather than only logged, since a silent
  // failure here just looks like Spotify's own auto-generated collage cover instead.
  let coverSet = false;
  let coverError: string | undefined;
  if (!hasImageUploadScope(tokens)) {
    coverError = 'Reconnect Spotify to allow custom cover art (disconnect below, then reconnect).';
  } else {
    try {
      const cover = await generateCassetteCoverJpegBase64(mixtape);
      await uploadPlaylistCover(playlistId, tokens.accessToken, cover);
      coverSet = true;
    } catch (err) {
      coverError = err instanceof Error ? err.message : 'Could not set playlist cover.';
    }
  }

  return { playlistUrl, playlistId, addedCount, skippedCount: skippedSongs.length, skippedSongs, coverSet, coverError };
}
