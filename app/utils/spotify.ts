import { SpotifySearchResponse, SpotifyTrack, Song } from '../types';

/**
 * Search for tracks via our server-side API endpoint.
 * Credentials never leave the server.
 */
export const searchSpotify = async (query: string): Promise<Song[]> => {
  if (!query.trim()) return [];

  const response = await fetch(
    `/api/spotify/search?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error('Spotify search failed');
  }

  const data: SpotifySearchResponse = await response.json();
  return data.tracks.items.map(convertSpotifyTrackToSong);
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
    duration: Math.floor(track.duration_ms / 1000),
    albumCover:
      track.album.images.find((img) => img.height >= 64)?.url ||
      track.album.images[0]?.url ||
      '',
    spotifyUri: track.uri,
  };
};
