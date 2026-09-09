# Deploying the Nuxt app to Vercel

This is the Nuxt 4 rewrite of Mixtape Maker. The React/Vite app has been fully
retired — this Nuxt app now lives at the **repo root**, not in a `nuxt/`
subdirectory.

## One-time Vercel setup

1. **Project → Settings → General → Root Directory:** leave blank (repo root).
2. **Framework Preset:** Vercel auto-detects **Nuxt.js** from the root
   `nuxt.config.ts`. Nitro's zero-config `vercel` preset emits
   `.vercel/output` automatically — you do **not** need a `vercel.json`, a
   custom build command, or SPA rewrites.
3. Build command / output dir: leave blank (framework defaults). Nuxt runs
   `nuxt build` and Nitro handles routing + the `/api/*` serverless functions.

## Environment variables (Vercel dashboard → Settings → Environment Variables)

| Purpose | Variable |
| --- | --- |
| Supabase URL (client) | `NUXT_PUBLIC_SUPABASE_URL` |
| Supabase anon key (client) | `NUXT_PUBLIC_SUPABASE_ANON_KEY` |
| Spotify client id (client, PKCE) | `NUXT_PUBLIC_SPOTIFY_CLIENT_ID` |
| Turnstile site key (client) | `NUXT_PUBLIC_TURNSTILE_SITE_KEY` |
| Spotify client id (server, track search) | `SPOTIFY_CLIENT_ID` |
| Spotify client secret (server, track search) | `SPOTIFY_CLIENT_SECRET` |

The public vars are wired through `runtimeConfig.public` in `nuxt.config.ts`; the
server secrets are read via `process.env` in `server/api/spotify/search.get.ts`.

Local dev uses a root-level `.env` (see `.env.example`, gitignored).

**Spotify export needs two separate credentials set correctly, or it breaks:**
`SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` (server-side, powers track search)
and `NUXT_PUBLIC_SPOTIFY_CLIENT_ID` (client-side, powers the "Export to
Spotify" PKCE login — usually the same client id value as `SPOTIFY_CLIENT_ID`,
just also exposed under the public-prefixed name). Search working does **not**
mean export will work — it only proves the server-side pair is set. If
clicking "Connect Spotify" / "Export to Spotify" shows *"Could not start
Spotify login. Check NUXT_PUBLIC_SPOTIFY_CLIENT_ID"*, that variable is empty
in whichever Vercel environment (Production/Preview) served the page. Fix:
add it in the Vercel dashboard for that environment, then **trigger a new
deployment** — Nuxt bakes `runtimeConfig.public` into the build output, so an
env var added after the last deploy has no effect until the next build.

## Rendering strategy (already configured in `nuxt.config.ts` `routeRules`)

- `/` — prerendered (static, full SEO).
- `/explore`, `/explore/**`, `/share/**` — SSR (server-rendered for SEO + link previews).
- `/mixtape`, `/library`, `/cards/**`, `/spotify-callback` — client-only (`ssr: false`),
  which keeps browser-only code (Tiptap, html-to-image, localStorage, FontFace) off the server.

## Spotify redirect URI

The PKCE flow redirects to `/spotify-callback`. Ensure that URL (for each deployed
domain) is registered in the Spotify developer dashboard, same as before.
