const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
export function getSpotifyClientId(): string {
  return (useRuntimeConfig().public.spotifyClientId as string) || '';
}
const SCOPES = 'playlist-modify-private playlist-modify-public user-read-private';
const STORAGE_KEY = 'spotify_tokens';
const VERIFIER_KEY = 'spotify_code_verifier';
const RETURN_PATH_KEY = 'spotify_return_path';

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(96);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function storeTokens(tokens: SpotifyTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function getStoredTokens(): SpotifyTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return getStoredTokens() !== null;
}

export function isTokenExpired(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return true;
  return Date.now() >= tokens.expiresAt - 60_000;
}

export async function refreshAccessToken(): Promise<SpotifyTokens> {
  const tokens = getStoredTokens();
  if (!tokens) throw new Error('Not connected to Spotify');

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: getSpotifyClientId(),
    }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Spotify session expired. Please reconnect.');
  }

  const data = await res.json();
  const updated: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  storeTokens(updated);
  return updated;
}

export function getRedirectUri(): string {
  const url = new URL('/spotify-callback', window.location.origin);
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url.toString();
}

export async function startSpotifyAuth(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getRedirectUri();

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(RETURN_PATH_KEY, window.location.pathname + window.location.search);

  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error('NUXT_PUBLIC_SPOTIFY_CLIENT_ID not set');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params}`;
}

export function getReturnPath(): string {
  return sessionStorage.getItem(RETURN_PATH_KEY) ?? '/mixtape';
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
}

export function getCodeVerifier(): string | null {
  return sessionStorage.getItem(VERIFIER_KEY);
}
