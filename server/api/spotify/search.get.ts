// Spotify track search proxy. Credentials stay on the server.
// Reads SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET from the environment
// (same names as the previous Vercel functions — no rename needed).
// Replaces both api/spotify/search.ts and the old Vite dev middleware.

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Spotify credentials not configured' });
  }

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Failed to get Spotify access token' });

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
  return cachedToken as string;
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event).q;
  if (!q || typeof q !== 'string' || !q.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or empty query parameter: q' });
  }

  const token = await getAccessToken();
  const res = await fetch(
    `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(q)}&type=track&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `Spotify search failed: ${res.status}` });
  }
  return res.json();
});
