import { SpotifySearchResponse, SpotifyTrack, Song } from '../types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get Spotify access token using client credentials flow
 */
const getAccessToken = async (
  clientId: string,
  clientSecret: string
): Promise<string> => {
  // Check if we have a valid token
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // Refresh 1 min before expiry

  return accessToken as string;
};

/**
 * Search for tracks on Spotify
 */
export const searchSpotify = async (
  query: string,
  clientId: string,
  clientSecret: string
): Promise<Song[]> => {
  if (!query.trim()) return [];

  try {
    const token = await getAccessToken(clientId, clientSecret);

    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(
        query
      )}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Spotify search failed');
    }

    const data: SpotifySearchResponse = await response.json();

    return data.tracks.items.map((track) => convertSpotifyTrackToSong(track));
  } catch (error) {
    console.error('Spotify search error:', error);
    throw error;
  }
};

/**
 * Convert Spotify track to our Song format
 */
const convertSpotifyTrackToSong = (track: SpotifyTrack): Song => {
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    duration: Math.floor(track.duration_ms / 1000), // Convert to seconds
    albumCover:
      track.album.images.find((img) => img.height >= 64)?.url ||
      track.album.images[0]?.url ||
      '',
    spotifyUri: track.uri,
  };
};
