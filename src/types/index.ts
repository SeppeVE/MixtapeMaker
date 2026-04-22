export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  albumCover: string;
  spotifyUri?: string;
}

export interface Mixtape {
  id: string;
  title: string;
  dedicatedTo?: string;
  cassetteLength: 60 | 90 | 120; // minutes
  sideA: Song[];
  sideB: Song[];
  createdAt: string;
  updatedAt: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  uri: string;
}

export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

export type CassetteLength = 60 | 90 | 120;
export type Side = 'A' | 'B';
