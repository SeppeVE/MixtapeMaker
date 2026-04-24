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

export interface JCardContent {
  flaps: 1 | 2 | 3 | 4 | 5 | 6;
  isReversed: boolean;
  shortBack: boolean;
  backgroundColor: string;
  backgroundImageUrl?: string;
  coverImageUrl?: string;
  coverImageBehindContent: boolean;
  isFullCoverImage: boolean;
  coverContent: string;
  spineTopContent: string;
  spineCenterContent: string;
  spineBottomContent: string;
  backLeftContent: string;
  backRightContent: string;
}

export interface JCard {
  id: string;
  title: string;
  userId: string;
  mixtapeId?: string | null;
  content: JCardContent;
  createdAt: string;
  updatedAt: string;
}
