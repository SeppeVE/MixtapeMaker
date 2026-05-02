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

export interface CustomFont {
  /** Display name, also used as the CSS font-family value. */
  name: string;
  /** Base64-encoded font file data. */
  data: string;
  /** MIME type (e.g. "font/woff2", "font/otf"). Used to build the data URL for FontFace. */
  mimeType: string;
}

export interface JCardContent {
  flaps: 1 | 2 | 3 | 4 | 5 | 6;
  isReversed: boolean;
  shortBack: boolean;
  backgroundColor: string;
  backgroundImageUrl?: string;
  /** When true a single background image/color spans the whole card instead of repeating per-panel */
  continuousBackground?: boolean;
  /** Separate background image for the inside panels (flaps, spine, back). Falls back to backgroundColor when absent. */
  insideBackgroundImageUrl?: string;
  coverImageUrl?: string;
  coverImageBehindContent: boolean;
  isFullCoverImage: boolean;
  /** @deprecated migrated to flapContents[0] — kept for backward-compat with existing saved cards */
  coverContent?: string;
  /** HTML content for each flap (index 0 = cover/front flap). Always length 6. */
  flapContents: string[];
  spineTopContent: string;
  spineCenterContent: string;
  spineBottomContent: string;
  backLeftContent: string;
  backRightContent: string;
  /** Show dashed fold/cut guides on the printable export */
  showCutGuides?: boolean;
  /** User-uploaded woff2 fonts stored as base64, available across all text editors for this card. */
  customFonts?: CustomFont[];
  /** @deprecated Use insideFlapContents / insideSpineContent / insideBackContent for per-panel inside content. */
  insideContent?: string;
  /** HTML content for the inside face of each flap (index 0 = cover). Always length 6. */
  insideFlapContents?: string[];
  /** HTML content for the inside of the spine panel. */
  insideSpineContent?: string;
  /** HTML content for the inside of the back panel. */
  insideBackContent?: string;
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
