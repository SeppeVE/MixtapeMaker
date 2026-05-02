import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

let devToken: string | null = null
let devTokenExpiry = 0

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'dev-spotify-api',
        configureServer(server) {
          server.middlewares.use('/api/spotify/search', async (req: IncomingMessage, res: ServerResponse) => {
            const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
            const q = url.searchParams.get('q')

            if (!q?.trim()) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Missing query parameter: q' }))
              return
            }

            try {
              // Refresh token if needed
              if (!devToken || Date.now() >= devTokenExpiry) {
                const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization:
                      'Basic ' +
                      Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
                  },
                  body: 'grant_type=client_credentials',
                })
                if (!tokenRes.ok) throw new Error('Token request failed')
                const tokenData = await tokenRes.json()
                devToken = tokenData.access_token
                devTokenExpiry = Date.now() + tokenData.expires_in * 1000 - 60_000
              }

              const searchRes = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`,
                { headers: { Authorization: `Bearer ${devToken}` } }
              )
              if (!searchRes.ok) throw new Error('Spotify search failed')

              const data = await searchRes.json()
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(data))
            } catch (err) {
              console.error('[dev-spotify-api]', err)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Search failed' }))
            }
          })
        },
      },
    ],
  }
})
