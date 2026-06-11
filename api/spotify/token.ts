import type { VercelRequest, VercelResponse } from '@vercel/node';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, codeVerifier, redirectUri } = req.body ?? {};

  if (!code || !codeVerifier || !redirectUri) {
    return res.status(400).json({ error: 'Missing code, codeVerifier, or redirectUri' });
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
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(400).json({ error: err.error_description ?? 'Token exchange failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Spotify token exchange error:', error);
    return res.status(500).json({ error: 'Token exchange failed' });
  }
}
