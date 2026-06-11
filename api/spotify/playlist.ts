import type { VercelRequest, VercelResponse } from '@vercel/node';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessToken, name, description, trackUris } = req.body ?? {};

  if (!accessToken || !name) {
    return res.status(400).json({ error: 'Missing accessToken or name' });
  }

  const authHeader = `Bearer ${accessToken}`;

  try {
    // Get Spotify user ID
    const meRes = await fetch(`${SPOTIFY_API}/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) {
      return res.status(401).json({ error: 'Invalid Spotify access token' });
    }
    const me = await meRes.json();
    const userId: string = me.id;

    // Create playlist
    const createRes = await fetch(`${SPOTIFY_API}/users/${userId}/playlists`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description ?? '',
        public: false,
      }),
    });
    if (!createRes.ok) {
      return res.status(500).json({ error: 'Failed to create playlist' });
    }
    const playlist = await createRes.json();
    const playlistId: string = playlist.id;
    const playlistUrl: string = playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlistId}`;

    // Add tracks in batches of 100
    const uris: string[] = Array.isArray(trackUris) ? trackUris : [];
    let tracksAdded = 0;

    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      const addRes = await fetch(`${SPOTIFY_API}/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: batch }),
      });
      if (addRes.ok) tracksAdded += batch.length;
    }

    return res.status(200).json({ playlistUrl, playlistId, tracksAdded });
  } catch (error) {
    console.error('Spotify playlist error:', error);
    return res.status(500).json({ error: 'Playlist creation failed' });
  }
}
