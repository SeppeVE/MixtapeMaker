# Deploying the Nuxt app to Vercel

This is the Nuxt 4 rewrite of Mixtape Maker. It lives in the `nuxt/` subdirectory
of the repo so the original React/Vite app stays runnable side-by-side during the
migration. When you're ready to cut over, deploy this folder.

## One-time Vercel setup

1. **Project → Settings → General → Root Directory:** set to `nuxt`.
2. **Framework Preset:** Vercel auto-detects **Nuxt.js** once the root dir is `nuxt/`.
   Nitro's zero-config `vercel` preset emits `.vercel/output` automatically — you do
   **not** need a `vercel.json`, a custom build command, or SPA rewrites. (The old
   root `vercel.json` and `prerender.mjs` belong to the React app; leave them until
   you retire it, then delete both.)
3. Build command / output dir: leave blank (framework defaults). Nuxt runs
   `nuxt build` and Nitro handles routing + the `/api/*` serverless functions.

## Environment variables (Vercel dashboard → Settings → Environment Variables)

Rename the client vars to the `NUXT_PUBLIC_` prefix; keep the server secrets as-is.

| Purpose | Old (Vite) | New (Nuxt) |
| --- | --- | --- |
| Supabase URL (client) | `VITE_SUPABASE_URL` | `NUXT_PUBLIC_SUPABASE_URL` |
| Supabase anon key (client) | `VITE_SUPABASE_ANON_KEY` | `NUXT_PUBLIC_SUPABASE_ANON_KEY` |
| Spotify client id (client, PKCE) | `VITE_SPOTIFY_CLIENT_ID` | `NUXT_PUBLIC_SPOTIFY_CLIENT_ID` |
| Spotify client id (server) | `SPOTIFY_CLIENT_ID` | `SPOTIFY_CLIENT_ID` (unchanged) |
| Spotify client secret (server) | `SPOTIFY_CLIENT_SECRET` | `SPOTIFY_CLIENT_SECRET` (unchanged) |

The public vars are wired through `runtimeConfig.public` in `nuxt.config.ts`; the
server secrets are read via `process.env` in `server/api/spotify/search.get.ts`.

Local dev uses `nuxt/.env` (already generated from the React `.env`, gitignored).

## Rendering strategy (already configured in `nuxt.config.ts` `routeRules`)

- `/` — prerendered (static, full SEO).
- `/explore`, `/explore/**`, `/share/**` — SSR (server-rendered for SEO + link previews).
- `/mixtape`, `/library`, `/cards/**`, `/spotify-callback` — client-only (`ssr: false`),
  which keeps browser-only code (Tiptap, html-to-image, localStorage, FontFace) off the server.

## Spotify redirect URI

The PKCE flow redirects to `/spotify-callback`. Ensure that URL (for each deployed
domain) is registered in the Spotify developer dashboard, same as before.
