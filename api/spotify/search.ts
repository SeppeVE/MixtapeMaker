import type { VercelRequest, VercelResponse } from '@vercel/node';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.status(400).json({ error: 'Missing or empty query parameter: q' });
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

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Spotify search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
}
