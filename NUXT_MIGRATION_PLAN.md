# Nuxt Migration Plan

Plan for rewriting MixtapeMaker from **React 18 + Vite (SPA + prerendered homepage, Vercel)** to **Nuxt** while keeping every existing feature working.

---

## 1. Current state inventory

Everything listed here must still work after the migration. This is the parity contract.

### Stack today

| Concern | Current implementation |
|---|---|
| UI framework | React 18 (TSX), function components + hooks |
| Routing | `react-router-dom` v7, routes declared in `src/routes.tsx` |
| Build | Vite 5, `tsc` typecheck, SSR build of `src/entry-server.tsx` + `prerender.mjs` (prerenders `/` only) |
| Hosting | Vercel (`vercel.json`: SPA fallback rewrite + `/api/*` serverless functions) |
| Serverless API | `api/spotify/{search,token,refresh,playlist}.ts` (`@vercel/node`); dev-only duplicate of `search` lives in `vite.config.ts` as a Vite middleware plugin |
| Auth & DB | Supabase (`@supabase/supabase-js`): email/password + Google OAuth, mixtape/J-card tables, image storage, share tokens, public explore feed |
| Spotify | Search via `/api/spotify/search` (client-credentials token held server-side); user OAuth via **client-side PKCE** (`src/utils/spotifyAuth.ts`, callback route `/spotify-callback`); playlist export runs **directly from the browser** (`src/utils/spotifyExport.ts`) |
| Rich text | TipTap v3 (`@tiptap/react`) with three custom extensions (`EnterAsBr`, `LetterSpacing`, `BlockLineHeight`) in `ContentEditor.tsx` |
| Export | `pdf-lib` + `html-to-image` for print-ready J-card PDFs (`src/utils/jcardPdf.ts`) |
| Sanitizing | `dompurify` (4 call sites) |
| Analytics | `@vercel/analytics/react` |
| Persistence | localStorage drafts (`src/utils/localStorage.ts`), Spotify tokens in localStorage |
| Fonts | Google Fonts `<link>`s in `index.html` + user-uploaded custom fonts (`fontManager.ts`, `FontFace` API) |
| SEO | Static meta / OG / Twitter / JSON-LD in `index.html`; homepage prerendered post-build |
| Drag & drop | Native HTML5 DnD in `TapeSide.tsx` |

### Routes (must map 1:1)

| Path | Page | Notes |
|---|---|---|
| `/` | HomePage | Only prerendered/SEO route |
| `/library` | LibraryPage | `?tab=jcards` query param |
| `/mixtape` | MixtapeEditorPage | |
| `/editor` | → redirect `/mixtape` | |
| `/cards` | → redirect `/library?tab=jcards` | |
| `/cards/designer` | JCardDesignerPage | |
| `/explore` | ExplorePage | |
| `/explore/:id` | PublicMixtapePage | |
| `/share/:token` | SharedMixtapePage | |
| `/spotify-callback` | SpotifyCallback | **Registered redirect URI in the Spotify dashboard — path must not change** |
| `*` | → redirect `/` | |

### Code volume

~6,000 lines of TS/TSX (33 components, 7 pages, 2 hooks, 1 context, 15 utils) + ~5,000 lines of plain CSS (framework-agnostic, ports unchanged).

### Notable findings to resolve during migration

- `api/spotify/token.ts`, `refresh.ts`, and `playlist.ts` are **not referenced anywhere in `src/`** — the frontend only calls `/api/spotify/search`. Token refresh and playlist creation happen client-side (PKCE). Port `search`; carry the other three over only after confirming nothing external depends on them, otherwise drop them (tracked in Phase 2).
- The Vite dev middleware in `vite.config.ts` exists only because Vercel functions don't run under `vite dev`. Nitro removes this problem entirely — one route definition serves dev and prod. The duplicate disappears.

---

## 2. Target architecture

**Nuxt 4** (current stable), Vue 3 Composition API with `<script setup lang="ts">`, Nitro server engine with the Vercel preset.

### Rendering strategy — match current behavior exactly

Today the app is a client-rendered SPA with only `/` prerendered for crawlers. Reproduce that with route rules instead of adopting full SSR (full SSR would force auditing every component for browser-API safety and change runtime behavior — not needed for parity):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },   // replaces prerender.mjs
    '/**': { ssr: false },      // everything else stays client-rendered
  },
})
```

This deletes `prerender.mjs`, `entry-server.tsx`, and the custom 3-step build script — `nuxt build` does all of it.

> Optional later enhancement (post-parity): enable SSR for `/explore/:id` and `/share/:token` so shared mixtapes get real OG tags per mixtape. Out of scope for the parity migration.

### Concept mapping

| React (today) | Nuxt (target) |
|---|---|
| `src/routes.tsx` + react-router | `pages/` file-based routing; redirects via `routeRules: { '/editor': { redirect: '/mixtape' } }` etc. |
| `src/main.tsx`, `index.html` | `app.vue` + `nuxt.config.ts` `app.head` (meta, JSON-LD, font links) |
| `useAppMixtapeState()` hook + prop-drilling through `AppRoutes` | `composables/useAppMixtapeState.ts` returning shared state via `useState()` — pages consume it directly, killing the 14-prop drill |
| `AuthContext` (React context) | `composables/useAuth.ts` + client plugin for the `onAuthStateChange` listener |
| `useJCardLibrary` hook | `composables/useJCardLibrary.ts` |
| `useState`/`useEffect`/`useMemo`/`useRef` | `ref`/`reactive`, `watch`/`onMounted`, `computed`, `ref` (template refs) |
| `@tiptap/react` (`useEditor`, `EditorContent`) | `@tiptap/vue-3` (`useEditor`, `EditorContent`) — same API shape; the 3 custom extensions are pure `@tiptap/core` and port **verbatim** |
| `api/spotify/*.ts` (`@vercel/node`) | `server/api/spotify/*.get.ts` / `*.post.ts` (Nitro `defineEventHandler`) — same URLs, so `src/utils/spotify.ts` needs no changes |
| Vite dev middleware for `/api/spotify/search` | Deleted — Nitro serves `server/api` in dev too |
| `vercel.json` rewrites | Deleted — Nitro's Vercel preset handles routing; keep `public/` assets (og-image, favicons, `googleaa8eda6e945a966a.html` site verification) |
| `import.meta.env.VITE_*` | `useRuntimeConfig().public.*` (client) / `runtimeConfig` (server); env vars renamed `VITE_*` → `NUXT_PUBLIC_*` |
| `@vercel/analytics/react` | `@vercel/analytics/nuxt` |
| CSS files imported per-component | Same files, imported in SFC `<style>` blocks or via `css:` array in `nuxt.config.ts` — **no rewrite** |

### What ports with zero/near-zero changes

All framework-agnostic code (~40% of the TS): `types/index.ts`, `utils/` (database, supabase, supabaseImages, spotify, spotifyAuth, spotifyExport, jcardPdf, jcardPresets, jcardDefaults, jcardDatabase, localStorage, fontManager, htmlUtils, timeUtils), `components/jcard/dimensions.ts`, all CSS, all `public/` assets, both setup docs.

Supabase: keep plain `@supabase/supabase-js` (do **not** adopt `@nuxtjs/supabase` — it switches sessions to cookie-based SSR auth, which would log out every existing user and change auth behavior; plain client keeps the same localStorage session key so **existing users stay signed in** after the switch).

### Target directory layout

```
app/
  app.vue                     # NuxtPage + AuthModal + Toast + Analytics (replaces App.tsx)
  pages/
    index.vue                 # HomePage
    library.vue
    mixtape.vue
    cards/designer.vue
    explore/index.vue
    explore/[id].vue
    share/[token].vue
    spotify-callback.vue
  components/
    auth/  home/  jcard/  spotify/  tape/  ui/    # 1:1 .tsx → .vue
  composables/
    useAuth.ts  useAppMixtapeState.ts  useJCardLibrary.ts  useToast.ts
  utils/                      # ported verbatim
  types/
  assets/styles/              # CSS ported verbatim
server/
  api/spotify/search.get.ts   # (+ playlist/refresh only if confirmed in use)
public/                       # og-image.png, favicons, google site verification
nuxt.config.ts
```

---

## 3. Migration phases

Do the work on a long-lived branch; the React app stays deployed and untouched until Phase 8 flips Vercel over. The app is small enough for an in-place rewrite (React files deleted at the end), which keeps git history in one repo.

### Phase 0 — Scaffold & config (small)
- `npx nuxi init`, wire TypeScript, port `tsconfig` strictness.
- `nuxt.config.ts`: `app.head` with **all** meta/OG/Twitter/JSON-LD/font links from `index.html`; route rules (prerender `/`, `ssr: false` catch-all, `/editor` + `/cards` + 404 redirects); `runtimeConfig` (`spotifyClientId`, `spotifyClientSecret` private; `public.spotifyClientId`, `public.supabaseUrl`, `public.supabaseAnonKey`).
- Update `.env.example` with the new `NUXT_*` names.
- ✅ Gate: `nuxt dev` serves a blank app; `nuxt build` succeeds; view-source of `/` shows all meta tags.

### Phase 1 — Framework-agnostic code (small, mechanical)
- Copy `types/`, all of `utils/`, `dimensions.ts`, all CSS, `public/` assets.
- Only edits: `import.meta.env.VITE_*` → `useRuntimeConfig().public.*` (3 files: `supabase.ts`, `spotifyAuth.ts`), and make the Supabase client a client-side plugin/composable so it's never constructed during prerender.
- ✅ Gate: `nuxt typecheck` passes.

### Phase 2 — Server API (small)
- `server/api/spotify/search.get.ts`: port the Vercel handler to `defineEventHandler` (`getQuery`, `createError`); keep the module-level token cache pattern.
- Decide fate of `token.ts` / `refresh.ts` / `playlist.ts`: grep confirms no frontend callers; check Vercel logs for external traffic. Port if used, delete if dead (record decision in the PR).
- Delete the dev middleware from the old `vite.config.ts` scope — not carried over.
- ✅ Gate: `curl localhost:3000/api/spotify/search?q=test` returns Spotify results in dev **and** in `nuxt preview` after build.

### Phase 3 — State & auth composables (medium)
- `useAuth.ts`: port `AuthContext` — `useState<User|null>('auth-user')`, plugin registers `onAuthStateChange`; expose `signUp/signIn/signInWithGoogle/signOut`.
- `useAppMixtapeState.ts`: port the hook 1:1 (mixtape draft, activeCard, toast, save/load/share/togglePublic handlers, localStorage autosave via `watch` instead of `useEffect`). `navigate()` → `navigateTo()`.
- `useJCardLibrary.ts`: same treatment.
- ✅ Gate: unit-level smoke — draft persists across reload, auth state survives refresh.

### Phase 4 — Components (large, the bulk of the work)
Port leaf-first, one feature folder at a time, each folder = one commit:
1. `ui/` — NavBar, Toast, SearchBar, Floaters (SearchBar's debounced fetch → same logic in `watch`).
2. `tape/` — CassetteSVG (SVG JSX → SVG template, mechanical), CassetteTape, TapeSide (**HTML5 DnD: `onDragStart` → `@dragstart` etc., same handlers**), TapePreview.
3. `home/` — 8 presentational sections + mocks (mechanical).
4. `auth/` — AuthModal.
5. `jcard/` — the hard folder: parts/ panels, previews, printables, ImageUpload, JCardSettings (602 lines), **ContentEditor (TipTap `@tiptap/vue-3`; custom extensions copied verbatim)**, JCardView, JCardLibrary, MixtapeLinkPicker.
6. `spotify/` — ExportToSpotify.

Conversion rules applied throughout: props interface → `defineProps<T>()`; callbacks (`onSave`, `onClose`…) → `defineEmits` or direct composable calls (most callback props exist only because of prop-drilling and simply disappear); `useState` → `ref`; `useEffect` → `watch`/`onMounted`/`onUnmounted`; conditional JSX → `v-if`; `.map()` → `v-for` with `:key`; `dangerouslySetInnerHTML` + DOMPurify → `v-html` + DOMPurify (same sanitize call sites — **do not drop sanitization**, `v-html` is equally XSS-prone).
- ✅ Gate per folder: component renders and its interactions work in a scratch page.

### Phase 5 — Pages (medium)
- Create the 8 pages listed in the layout table; each wires composables directly instead of receiving 10+ props.
- `library.vue` reads `?tab=` via `useRoute().query`; `[id]`/`[token]` params via `useRoute().params`.
- `spotify-callback.vue` ports `SpotifyCallback.tsx` exactly (reads `?code`, exchanges PKCE verifier, restores return path).
- Route-level redirects verified: `/editor`, `/cards`, unknown → `/`.
- ✅ Gate: full manual click-through of every route.

### Phase 6 — SEO & prerender (small)
- Confirm prerendered `/` HTML contains hero content + JSON-LD (replaces `prerender.mjs`); `useHead` per-page titles where the old app set them.
- `og-image.png`, favicons, canonical URL, Google site-verification file all served from `public/`.
- ✅ Gate: `nuxt build` output inspected; Lighthouse SEO score ≥ current site.

### Phase 7 — Cleanup (small)
- Delete `src/`, `api/`, `index.html`, `vite.config.ts`, `prerender.mjs`, `vercel.json`, old tsconfigs, React deps from `package.json`.
- Update `README.md`, `SUPABASE_SETUP.md`, `GOOGLE_AUTH_SETUP.md` (env var names, dev commands).
- ✅ Gate: fresh `npm ci && npm run build` from a clean checkout.

### Phase 8 — Deploy & cutover (small, the only risky step)
1. Set new env vars in Vercel: `NUXT_SPOTIFY_CLIENT_ID`, `NUXT_SPOTIFY_CLIENT_SECRET`, `NUXT_PUBLIC_SPOTIFY_CLIENT_ID`, `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY` (keep old `VITE_*`/`SPOTIFY_*` until cutover is confirmed).
2. Deploy the branch as a Vercel **preview** and run the full parity checklist (§4) against it. Note: Spotify PKCE and Supabase Google OAuth redirect URIs are domain-bound — either temporarily add the preview URL to both dashboards, or test those two flows only on production domain right after cutover.
3. Merge → production. Verify checklist again on `mixtape-maker.com`.
4. Rollback plan: instant — revert the merge commit; Vercel redeploys the React app. Nothing about Supabase data, session storage, or Spotify registration changed, so rollback is safe at any point.

---

## 4. Parity checklist ("everything stays working")

Run on preview before merge and on production after. Every line maps to an existing feature.

**Mixtape editor**
- [ ] Spotify search returns tracks (`/api/spotify/search`), debounce works
- [ ] Add to Side A / Side B; duration totals + over-length warnings per cassette length (60/90/120)
- [ ] Drag-and-drop reorder within a side; move track between sides; remove track
- [ ] Title edit; new mixtape; draft auto-saves to localStorage and survives reload

**Auth & cloud**
- [ ] Email/password sign-up + sign-in; Google OAuth sign-in; sign-out
- [ ] **Existing users are still logged in after cutover** (same Supabase localStorage session key)
- [ ] Save mixtape to cloud; library lists, loads, deletes; save draft-to-cloud from library
- [ ] Toggle public/private; enable share link; `/share/:token` renders for anonymous visitor
- [ ] Explore feed lists public mixtapes; `/explore/:id` opens one

**J-card designer**
- [ ] Open designer from library (existing card + new card); designer works with no mixtape
- [ ] Rich-text editing: bold/italic/underline, alignment, color, font size, font family, letter spacing, line height, Enter-as-`<br>`
- [ ] Curated Google fonts render; custom font upload (woff/woff2/otf/ttf) applies
- [ ] Image upload to Supabase storage; link mixtape tracklist into card
- [ ] Front + inside previews match old rendering; **PDF export prints at correct physical dimensions** (compare output PDF against one generated from the React app — this is the highest-fidelity-risk feature)
- [ ] Card presets; card library save/load/delete

**Spotify export**
- [ ] Connect via PKCE (`/spotify-callback` round-trip, return-path restore)
- [ ] Token refresh on expiry; export creates playlist with correct tracks; skipped-song report
- [ ] Export button works on public/shared mixtape pages (recent feature, commit `d42d2cd`)

**Platform**
- [ ] All 11 routes + 3 redirects; deep-link refresh on every route (no 404s)
- [ ] View-source of `/` shows full meta/OG/JSON-LD; og-image resolves; Google site verification file reachable
- [ ] Vercel Analytics events flowing
- [ ] Toasts, AuthModal, NavBar states (logged in/out) on every page
- [ ] No console errors on any page; mobile viewport spot-check

---

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| TipTap behavior drift (React vs Vue bindings) | Custom extensions are core-level and copied verbatim; test all toolbar actions + serialize a card made in the old app and load it in the new one (stored HTML must render identically) |
| PDF export pixel/size regression (`html-to-image` captures Vue-rendered DOM) | Same DOM structure + same CSS ⇒ same capture; diff old vs new PDFs at 100% zoom before cutover |
| Logged-out users after cutover | Avoided by keeping plain `supabase-js` (same storage key); explicitly verified in checklist |
| Spotify redirect URI mismatch on preview | Test PKCE on production domain immediately post-cutover, or temporarily register preview URL |
| Prerender executes browser-only code | `ssr: false` for all routes except `/`; homepage components are presentational; Supabase/localStorage access lives in client plugin + `onMounted` |
| Env var rename breaks prod silently | Keep old vars set during transition; checklist exercises every integration (search = Spotify server creds, auth = Supabase, PKCE = public client id) |
| Losing SEO on `/` | Compare prerendered HTML before/after; canonical + JSON-LD asserted in Phase 6 gate |

## 6. Suggested sequencing / effort

Phases 0–2 (~½ day) → Phase 3 (~½ day) → Phase 4 (~2–3 days, jcard folder is half of it) → Phases 5–6 (~1 day) → Phases 7–8 (~½ day). Total ≈ 5 focused days, each phase landing as a reviewable commit on this branch.
