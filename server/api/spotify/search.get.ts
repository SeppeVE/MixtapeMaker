const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const config = useRuntimeConfig();
  const clientId = config.spotifyClientId;
  const clientSecret = config.spotifyClientSecret;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;

  return cachedToken as string;
}

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event);

  if (!q || typeof q !== 'string' || !q.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or empty query parameter: q' });
  }

  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(q)}&type=track&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Spotify search error:', error);
    throw createError({ statusCode: 500, statusMessage: 'Search failed' });
  }
});
