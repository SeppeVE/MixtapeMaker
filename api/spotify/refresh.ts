import type { VercelRequest, VercelResponse } from '@vercel/node';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body ?? {};

  if (!refreshToken) {
    return res.status(400).json({ error: 'Missing refreshToken' });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Spotify client not configured' });
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(400).json({ error: err.error_description ?? 'Token refresh failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Spotify token refresh error:', error);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
}
