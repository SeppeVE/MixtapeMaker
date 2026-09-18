import { Mixtape, Side, Song } from '../types';
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

export interface SideExportResult {
  side: Side;
  status: 'ok' | 'failed' | 'empty';
  result?: ExportResult;
  /** Set when status is 'failed' (the error message) or 'empty' (why nothing was exported). */
  error?: string;
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

async function getSpotifyExportContext(): Promise<{ tokens: SpotifyTokens; userId: string }> {
  let tokens: SpotifyTokens | null = getStoredTokens();
  if (!tokens) throw new Error('Not connected to Spotify');
  if (isTokenExpired()) tokens = await refreshAccessToken();

  const me = await spotifyFetch(`${API}/me`, tokens.accessToken);
  return { tokens, userId: me.id };
}

async function createSidePlaylist(
  tokens: SpotifyTokens,
  userId: string,
  mixtape: Mixtape,
  name: string,
  songs: Song[],
  coverSide: Side | 'both',
): Promise<ExportResult> {
  const trackUris = songs.filter(s => s.spotifyUri).map(s => s.spotifyUri as string);
  const skippedSongs = songs.filter(s => !s.spotifyUri);

  const playlist = await spotifyFetch(`${API}/users/${userId}/playlists`, tokens.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name,
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
      const cover = await generateCassetteCoverJpegBase64(mixtape, coverSide === 'both' ? 'A' : coverSide);
      await uploadPlaylistCover(playlistId, tokens.accessToken, cover);
      coverSet = true;
    } catch (err) {
      coverError = err instanceof Error ? err.message : 'Could not set playlist cover.';
    }
  }

  return { playlistUrl, playlistId, addedCount, skippedCount: skippedSongs.length, skippedSongs, coverSet, coverError };
}

export async function exportMixtapeToSpotify(mixtape: Mixtape): Promise<ExportResult> {
  const { tokens, userId } = await getSpotifyExportContext();
  const allSongs = [...mixtape.sideA, ...mixtape.sideB];
  return createSidePlaylist(tokens, userId, mixtape, mixtape.title, allSongs, 'both');
}

/**
 * Exports Side A and Side B as two separate playlists. Runs sequentially and
 * catches per side so a Side B failure doesn't discard an already-created
 * Side A playlist — the caller gets a result per side either way.
 */
export async function exportMixtapeSidesToSpotify(mixtape: Mixtape): Promise<SideExportResult[]> {
  const { tokens, userId } = await getSpotifyExportContext();
  const baseTitle = mixtape.title || 'Untitled Mixtape';
  const sides: { side: Side; songs: Song[] }[] = [
    { side: 'A', songs: mixtape.sideA },
    { side: 'B', songs: mixtape.sideB },
  ];

  const results: SideExportResult[] = [];
  for (const { side, songs } of sides) {
    if (!songs.some(s => s.spotifyUri)) {
      results.push({ side, status: 'empty', error: `Side ${side} had no Spotify tracks` });
      continue;
    }
    try {
      const result = await createSidePlaylist(tokens, userId, mixtape, `${baseTitle} (Side ${side})`, songs, side);
      results.push({ side, status: 'ok', result });
    } catch (err) {
      results.push({ side, status: 'failed', error: err instanceof Error ? err.message : 'Export failed' });
    }
  }
  return results;
}
