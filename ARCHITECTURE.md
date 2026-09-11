# Mixtape Maker — Architecture & Project Map

A guide to where everything lives and how the pieces fit together. Read this
before touching the code; keep it updated when you add a page, table, store
or third-party service.

Related docs:

- `README.md` — feature overview and getting started
- `SUPABASE_SETUP.md` — every SQL statement the database needs, in order
- `DEPLOYMENT.md` — Vercel setup and environment variables
- `GOOGLE_AUTH_SETUP.md` — Google sign-in configuration

---

## 1. Stack at a glance

| Layer | What | Notes |
| --- | --- | --- |
| Framework | **Nuxt 4** (Vue 3, `<script setup>` + TypeScript) | Hybrid rendering: some routes prerendered, some SSR, some client-only |
| State | **Pinia** stores in `app/stores/` | Auth, profile, current mixtape, J-card library, UI (toasts/modals) |
| UI kit | **@nuxt/ui** (only `UPagination` is used) + hand-written CSS | Retro "paper & cassette" design tokens live in `app/assets/css/App.css` |
| Rich text | **Tiptap** | J-card panel editor (`ContentEditor.vue`) |
| Backend | **Supabase** | Postgres + Row Level Security, Auth (email + Google), Storage buckets |
| Server routes | **Nitro** (`server/`) | One route: a Spotify search proxy with an in-memory rate limiter |
| External APIs | Spotify (search via server, export via user PKCE token), Cloudflare Turnstile (captcha), Vercel Analytics | |
| PDF export | `html-to-image` + `pdf-lib` | Renders the J-card DOM to PNG, embeds in a PDF |
| Fonts | Self-hosted via **Fontsource** | `app/assets/css/fonts.css`; nothing is fetched from Google |
| Profanity | `obscenity` | `app/utils/profanity.ts`, client-side only |
| Hosting | **Vercel** | Nitro's Vercel preset, no `vercel.json` needed |

There is no test suite and type-checking is disabled in `nuxt.config.ts`
(`typescript.typeCheck: false`). The verification loop is `npm run build`
plus manual testing.

---

## 2. Directory layout

```
.
├── app/                     Nuxt app (compatibilityVersion 4 → everything under app/)
│   ├── app.vue              Root: <NuxtLayout><NuxtPage/></NuxtLayout>
│   ├── layouts/default.vue  Wraps every page with AuthModal, FeedbackModal, Toast
│   ├── pages/               File-based routes (see §3)
│   ├── components/          Auto-imported by *filename only* (no folder prefix)
│   │   ├── auth/            AuthModal, TurnstileWidget
│   │   ├── feedback/        FeedbackModal
│   │   ├── home/            Landing-page sections + HomeFooter
│   │   ├── jcard/           Designer, previews, printables, settings, library grid
│   │   │   └── parts/       One component per physical panel of the J-card
│   │   ├── mixtape/         MixtapeDetailView (shared by explore + share pages)
│   │   ├── notifications/   NotificationModal ("What's new" popup)
│   │   ├── spotify/         ExportToSpotify button
│   │   ├── tape/            Cassette SVG, editor side lists, read-only side lists
│   │   ├── ui/              NavBar, SearchBar, Toast, AuthorByline, Floaters
│   │   └── ExplorePagination.vue
│   ├── stores/              Pinia stores (see §5)
│   ├── utils/               Plain TS modules: DB access, Spotify, PDF, helpers (see §6)
│   ├── plugins/auth.client.ts   Boots the auth + profile stores on the client
│   ├── types/index.ts       All shared TS interfaces (Song, Mixtape, JCard, Profile…)
│   └── assets/
│       ├── css/             One file per feature, aggregated by index.css (see §8)
│       └── images/          Placeholder art + icons
├── server/
│   ├── api/spotify/search.get.ts   GET /api/spotify/search?q= (Spotify proxy)
│   └── utils/rateLimit.ts          Fixed-window in-memory limiter
├── public/                  Static files: favicons, og-image, robots.txt, sitemap.xml
├── nuxt.config.ts           Modules, route rules, runtime config, <head> metadata
├── SUPABASE_SETUP.md        The database schema, as runnable SQL
└── .env.example             Every environment variable the app reads
```

**Component auto-import:** `nuxt.config.ts` sets `components: [{ path: '~/components', pathPrefix: false }]`,
so `app/components/jcard/JCardPreview.vue` is used as `<JCardPreview>`, not
`<JcardJCardPreview>`. Filenames must therefore be unique across all folders.

---

## 3. Routes (pages) and how each renders

Rendering mode is set per route in `nuxt.config.ts` → `routeRules`.
"Client-only" pages never run on the server, which is how browser-only code
(Tiptap, `localStorage`, `FontFace`, `html-to-image`) stays off Nitro.

| Route | File | Render | What it does |
| --- | --- | --- | --- |
| `/` | `pages/index.vue` | prerender | Landing page: hero, feature bar, sections, CTA with recent tapes, footer. Mounts `<NotificationModal>`. |
| `/mixtape` | `pages/mixtape.vue` | client | The editor: Spotify search, Side A/B lists with drag-reorder, cassette preview, save/public/share. |
| `/library` | `pages/library.vue` | client | Two tabs (`?tab=jcards`): cloud mixtapes (public toggle, share link, delete) and the J-card grid. |
| `/cards/designer` | `pages/cards/designer.vue` | client | J-card designer; wraps `<JCardView>` with the store's `activeCard`. |
| `/explore` | `pages/explore/index.vue` | SSR | Public mixtapes with title search + pagination; author bylines. |
| `/explore/:id` | `pages/explore/[id].vue` | SSR | One public mixtape + author + public J-cards linked to it. 404 if private. |
| `/share/:token` | `pages/share/[token].vue` | SSR | A mixtape by share token, public or not. Same view component as explore. |
| `/user/:username` | `pages/user/[username].vue` | SSR | Public profile: avatar, bio, public mixtapes and J-cards, or the "private" notice. |
| `/jcard/:id` | `pages/jcard/[id].vue` | SSR | A single public J-card, read-only, with a link to its mixtape. |
| `/profile` | `pages/profile.vue` | client | Own dashboard: picture, username, bio, privacy, sign out, delete account. |
| `/admin` | `pages/admin.vue` | client | Post/delete site notifications. Gated by `profile.isAdmin`. |
| `/how-to` | `pages/how-to.vue` | SSR | Static guide on recording to cassette. |
| `/privacy` | `pages/privacy.vue` | prerender | Privacy policy. Update it whenever a data flow changes. |
| `/spotify-callback` | `pages/spotify-callback.vue` | client | OAuth PKCE return leg; exchanges the code, stores tokens, redirects back. |
| `/editor`, `/cards` | (route rules) | redirect | Legacy URLs → `/mixtape`, `/library?tab=jcards`. |

SSR pages fetch with `useAsyncData` and, on a miss, call `setResponseStatus(404)`
so crawlers see a real 404. All SSR data access goes through the Supabase
**anon** key with RLS deciding what's visible; the server never holds a user session.

---

## 4. Data model

### 4.1 TypeScript types (`app/types/index.ts`)

| Type | Purpose |
| --- | --- |
| `Song` | One track: id, title, artist, album, duration (s), album cover URL, optional `spotifyUri`. |
| `Mixtape` | id, `userId?`, title, `dedicatedTo?`, `cassetteLength` (60/90/120), `sideA`/`sideB: Song[]`, timestamps, `isPublic`, `shareToken?`, `isCopy?`. |
| `JCard` | id, title, `userId`, `mixtapeId?`, `content: JCardContent`, timestamps, `isPublic?`. |
| `JCardContent` | Everything the designer edits: flap count, colours, per-panel HTML, images, inside face, PDF options, custom fonts. Has deprecated fields that `migrateJCardContent()` upgrades on load. |
| `Profile` | id (= auth user id), username, avatarUrl, bio, isPrivate, isAdmin, seenNotificationId, createdAt. |
| `AppNotification` | id, title, body, linkUrl?, linkLabel?, createdAt. |
| `CustomFont` | Uploaded font as base64 + MIME type, stored inside `JCardContent`. |

**IDs:** local drafts use a timestamp-based id from `generateId()`. On first
cloud save a mixtape gets a *deterministic* UUID derived from that local id
(`deterministicUuid()` in `utils/database.ts`) so retries never create
duplicates. J-cards let Postgres mint a UUID. `isCloudId()` tells them apart.

### 4.2 Database tables (Supabase / Postgres)

Full SQL with RLS policies is in `SUPABASE_SETUP.md`. Summary:

| Table | Owner column | Who can read | Notes |
| --- | --- | --- | --- |
| `mixtapes` | `user_id` | owner; anyone if `is_public`; anyone with `share_token` | `is_copy` marks an unedited copy from Explore (can't be made public). |
| `jcards` | `user_id` | owner; anyone if `is_public` | `mixtape_id` links a card to a tape. |
| `profiles` | `id` (= `auth.users.id`) | everyone | Created by a trigger on sign-up. Column-level grants stop clients from writing `is_admin`. |
| `notifications` | `created_by` | signed-in users | Insert/delete only when `is_admin()` is true. |
| `feedback` | `user_id` (nullable) | nobody via API | Insert-only, rate-limited per user by a SECURITY DEFINER function. |

Storage buckets:

| Bucket | Path convention | Used by |
| --- | --- | --- |
| `jcard-images` | `{userId}/{cardId}/{type}-{ts}.{ext}` | J-card cover/background uploads (`utils/supabaseImages.ts`) |
| `avatars` | `{userId}/avatar-{ts}.jpg` | Profile pictures, resized to 256px client-side (`utils/profileDatabase.ts`) |

SQL functions the client calls or relies on:

| Function | Purpose |
| --- | --- |
| `generate_username(email)` | Email prefix → sanitised unique username; used by the sign-up trigger and backfill. |
| `handle_new_user()` | Trigger on `auth.users` insert → creates the `profiles` row. |
| `is_admin()` | Reads the caller's `profiles.is_admin`; used in notification policies. |
| `feedback_rate_limit_ok(uid)` | One feedback per user per 10 minutes. |
| `delete_own_account()` | Deletes the caller's `auth.users` row; cascades to profile, mixtapes, jcards. Called via `supabase.rpc()`. |

### 4.3 Browser storage (`utils/localStorage.ts`, `utils/spotifyAuth.ts`)

| Key | Contents |
| --- | --- |
| `mixtape-current` | The mixtape being edited (auto-saved on every change). |
| `jcard-active` | The card open in the designer. |
| `jcards` | Locally saved J-cards (also the offline copy of cloud cards). |
| `mixtape-pending-save-ids` | local id → cloud id cache for first saves (capped at 200). |
| Spotify tokens | Access/refresh token for playlist export; never sent to our server. |
| `mixtape-feedback-last-submit` | Client-side feedback cooldown. |
| `mixtape-notification-dismissed` (session) | Notification closed in this tab. |

---

## 5. Stores (`app/stores/`)

All stores are Pinia setup-stores. They're the only place that holds
cross-page state; pages and components read them directly rather than
prop-drilling.

| Store | Holds | Key actions |
| --- | --- | --- |
| `auth.ts` | Supabase `user`, `session`, `loading` | `init()` wires `onAuthStateChange`; `signUp/signIn/signInWithGoogle/signOut`. |
| `profile.ts` | The signed-in user's `Profile`, `loading`, `isAdmin`, `displayName` | `init()` watches auth and loads (or creates) the profile row; `update(patch)`; `markNotificationSeen(id)`. |
| `mixtape.ts` | The current `mixtape` draft, `activeCard` for the designer, `isSaving` | `updateMixtape(patch)` (tracks whether a copy is still unedited), `save()`, `togglePublic(tape, bool)` (profanity-gated), `enableShare/disableShare`, `openDesigner(card)`. Persists to localStorage via watchers. |
| `jcardLibrary.ts` | Merged list of local + cloud cards, which ids are in the cloud | `loadCards()`, `cardStatus(card)` → local/cloud/synced, `uploadCard`, `deleteCard`, `togglePublic` (profanity-gated). |
| `ui.ts` | Toast, auth-modal open, feedback-modal open | `showToast`, `openAuth`, `openFeedback`… |

Boot order on the client (`plugins/auth.client.ts`): `auth.init()` then
`profile.init()`. The profile store watches `[auth.loading, auth.user.id]`
and reloads whenever the user changes.

---

## 6. Utilities (`app/utils/`)

### Database access (one module per table, all return app-shaped objects)

| Module | Talks to | Highlights |
| --- | --- | --- |
| `supabase.ts` | — | Lazily creates the client from `runtimeConfig.public` (safe under SSR). Exported as a Proxy so call sites just use `supabase.from(...)`. |
| `database.ts` | `mixtapes` | save (idempotent id logic), load own/public/shared, toggle public, share tokens, `searchPublicMixtapes` (paged), `loadPublicMixtapesByUser`. Maps `snake_case` ↔ `camelCase`. |
| `jcardDatabase.ts` | `jcards` | CRUD, `upsertJCard` for local→cloud upload, public queries by user / by mixtape, `toggleJCardPublic`. |
| `profileDatabase.ts` | `profiles`, `avatars` bucket | Username rules (`USERNAME_RE`, `normalizeUsername`, `usernameError`), `loadOrCreateOwnProfile` (fallback if the trigger didn't run), `loadProfilesByIds` (bylines), `updateProfile`, avatar upload with canvas crop, `deleteOwnAccount`. |
| `notificationDatabase.ts` | `notifications` | `loadLatestNotification`, `listNotifications`, `createNotification`, `deleteNotification`. |
| `feedbackDatabase.ts` | `feedback` | `submitFeedback`, `isRateLimitError`. |
| `supabaseImages.ts` | `jcard-images` bucket | Upload with data-URL fallback if the bucket is unavailable; delete by public URL. |

### Spotify

| Module | Role |
| --- | --- |
| `spotify.ts` | `searchSpotify(query)` → calls our `/api/spotify/search` proxy and maps results to `Song[]`. |
| `spotifyAuth.ts` | PKCE flow for the *user's* account: `startSpotifyAuth`, token storage/refresh, `hasImageUploadScope`. |
| `spotifyExport.ts` | Creates a playlist from a mixtape, adds tracks, tries to set the cassette art as cover. |
| `cassetteCoverImage.ts` | Rasterises the cassette SVG to a small JPEG (string template, no Vue) for the playlist cover. |

### J-card

| Module | Role |
| --- | --- |
| `jcardDefaults.ts` | `buildBlankJCardContent`, `migrateJCardContent` (upgrades old saved shapes), `applyMixtapeToJCard` (pulls track list into panels). |
| `jcardPresets.ts` | Ready-made designs applied from the settings panel. |
| `jcardPdf.ts` | Paper size / duplex logic and `exportJCardToPDF`: mounts `JCardPrintable` (+ inside) in a detached `createApp`, snapshots with `html-to-image`, lays pages out with `pdf-lib`. |
| `jcardSanitize.ts` | DOMPurify wrapper for panel HTML before `v-html`. SSR-safe. |
| `htmlUtils.ts` | `liftListColors` — copies span colours onto `<li>` so list markers match. |
| `fontManager.ts` | Curated font list (self-hosted) and `registerCustomFonts` (base64 → `FontFace`). |

### Misc

| Module | Role |
| --- | --- |
| `profanity.ts` | `containsProfanity`, `findProfanity(fields)`, `PROFANITY_MESSAGE`. Used for usernames, bios, and anything being made public. Client-side only. |
| `mixtapeTitle.ts` | `DEFAULT_MIXTAPE_TITLE`, `isMixtapeUntitled` (blocks cloud-saving unnamed tapes). |
| `timeUtils.ts` | Duration formatting, side-limit maths, `generateId`. |
| `localStorage.ts` | The keys listed in §4.3. |

---

## 7. Components by feature

### Navigation & chrome
- `ui/NavBar.vue` — logo, breadcrumb slot, right-hand buttons (Admin, Guide, Explore, Library, Sign In *or* profile avatar button). Collapses into a hamburger panel under 900px; the panel repeats the breadcrumb slot.
- `home/HomeFooter.vue` — brand, privacy link, Feedback / Contact / Buy-me-a-coffee. Used on every page.
- `ui/Toast.vue`, `auth/AuthModal.vue`, `feedback/FeedbackModal.vue` — mounted once in `layouts/default.vue`, driven by the `ui` store.
- `notifications/NotificationModal.vue` — mounted on the homepage only. Shows the newest notification if its id ≠ `profile.seenNotificationId` and it wasn't closed in this tab.

### Mixtape editor (`/mixtape`)
- `ui/SearchBar.vue` + `ui/SearchResult.vue` — debounced Spotify search, "add to A/B" with on-tape indicators.
- `tape/TapeSide.vue` — one side's track list with drag-and-drop reorder, remove, move-to-other-side, remaining-time bar.
- `tape/TapePreview.vue` — cassette art, title/dedication, length picker, save / new / public / share / export actions.
- `tape/CassetteSVG.vue` — the animated cassette graphic (also reused on detail pages).
- `spotify/ExportToSpotify.vue` — connect + export button with state machine.
- `ui/Floaters.vue` / `FloaterShape.vue` — decorative background shapes that change with the active side.

### Explore / sharing
- `mixtape/MixtapeDetailView.vue` — read-only tape page used by `/explore/:id` and `/share/:token`: cassette, Spotify export, `tape/ReadOnlySide` lists, "Copy to my library", author byline, linked public J-cards.
- `ui/AuthorByline.vue` — "by @username" with avatar. Rendered as a `<span role="link">` so it can sit inside a card that is itself a link.
- `ExplorePagination.vue` — wraps `UPagination` with the site's button styling; `show-edges` keeps first/last visible.

### J-card designer (`/cards/designer`)
- `jcard/JCardView.vue` — owns the card being edited: undo/redo history, debounced autosave (local first, cloud if signed in), public toggle guard. Renders previews + settings.
- `jcard/JCardSettings.vue` + `SettingsBlock.vue` + `settingsSections.ts` — the collapsible right-hand panel (info, presets, layout, fonts, flaps, background, spine, back, inside, mixtape link, export).
- `jcard/ContentEditor.vue` — Tiptap editor with custom extensions for per-panel HTML.
- `jcard/ImageUpload.vue`, `MixtapeLinkPicker.vue` — helpers used inside settings.
- `jcard/JCardPreview.vue` / `JCardInsidePreview.vue` — scaled live previews (client-only: they use `document.fonts` and ResizeObserver).
- `jcard/JCardPrintable.vue` / `JCardInsidePrintable.vue` — 1:1 mm-accurate versions used only by the PDF exporter; import their parts explicitly because they render outside Nuxt.
- `jcard/parts/*` — `CoverFlap`, `ContentFlap`, `Spine`, `BackPanel`, `InsidePanel`, `InsideBackPanel`; `dimensions.ts` holds the mm widths, `inside.ts` resolves inside-face settings shared by preview and printable.
- `jcard/JCardReadOnly.vue` — both previews wrapped in `<ClientOnly>` plus custom-font registration; used on public pages.
- `jcard/JCardLibrary.vue` — the card grid in `/library` with local/cloud/synced badges, upload, public toggle, delete.

### Landing page
- `home/HeroSection`, `TapeStrip`, `FeatureBar`, `MixtapeSection`, `JCardSection`, `HowItWorksSection`, `CtaSection` (shows recent tapes when signed in), plus the `*Mock` components that draw fake UI for illustration.

---

## 8. Styling

- **Global entry:** `app/assets/css/index.css` imports, in order: Tailwind + Nuxt UI, `fonts.css`, `App.css` (design tokens: colours, shadows, spacing, `--font-display` VT323 / `--font-body`), then one file per feature.
- **Conventions:** plain CSS with BEM-ish prefixes per area — `lp-` (landing/nav), `lib-` (library/explore pages), `gd-` (guide/privacy), `pf-` (profiles), `adm-` (admin), `notif-` (notification modal), `jcard-`/`jcl-` (designer/library), `explore-pager-`.
- **Shared page shells:** `.lib-page` + `.lib-header` + `.lib-section` is the standard "app page" frame (library, explore, profile, admin, detail pages). `.gd-page` is the long-form article frame (how-to, privacy).
- **Buttons:** `.lp-btn` with colour modifiers (`-paper`, `-mustard`, `-plum`, `-forest`, `-seafoam`); `.btn` is the smaller in-panel button.
- **Breakpoints:** 900px (nav collapses, feature bar goes 2-col), 768px (section heads stack), 600px (single column, stacked footer buttons).
- Tailwind is loaded (Nuxt UI needs it) but the codebase barely uses it; the few utility classes in use (`transform-origin-top-left`, `transition-opacity`, `height-max-content`…) are hand-written in `utilities.css`. Keep styling in the feature CSS files rather than sprinkling Tailwind classes into templates.

---

## 9. Key flows

**Sign-in → profile.** `AuthModal` calls the auth store. Supabase fires
`onAuthStateChange` → `auth.user` set → profile store loads
`profiles` row (creating one if the DB trigger didn't) → NavBar shows the
avatar button, `NotificationModal` checks for something new.

**Saving a mixtape.** Editor edits go through `store.updateMixtape()` and are
mirrored to localStorage instantly. "Save to Cloud" → `store.save()` checks
signed-in, named, and (if already public) profanity-clean → `saveMixtape()`
upserts with the deterministic UUID → store now holds the cloud copy.

**Making something public.** `togglePublic` in the mixtape or J-card store
runs `findProfanity()` over the user-written text first and refuses with a
toast. The library's optimistic toggle rolls back on `false`.

**Explore.** SSR fetches page 1 with `searchPublicMixtapes` (RLS only returns
`is_public` rows that aren't copies) then batch-loads authors with
`loadProfilesByIds`. Client-side search/paging repeats the same two calls.

**Copy from Explore.** `MixtapeDetailView.handleCopy` clones the tape with a
new local id and `isCopy: true`, loads it into the editor. The store keeps a
content signature; until the content differs, "Make Public" stays disabled.

**J-card autosave.** `JCardView.update()` pushes history, saves to
localStorage, and schedules `doSave()` 1.2s later; if signed in it creates or
updates the cloud row and adopts the returned id.

**PDF export.** `exportJCardToPDF()` mounts the printable components in a
hidden `createApp`, waits for fonts/images, `toPng()`s each face, and places
them on A4/Letter/fit pages via `pdf-lib`, mirroring page 2 for duplex.

**Spotify export.** Button → `startSpotifyAuth()` (PKCE, redirect to Spotify)
→ `/spotify-callback` exchanges the code and stores tokens in localStorage →
back on the page, `exportMixtapeToSpotify()` creates the playlist, adds
tracks by URI, and uploads the cassette JPEG as cover if the scope allows.

**Notifications.** Admin posts via `/admin` (RLS checks `is_admin()`). On the
homepage the modal fetches the single newest row; "Close" writes a
sessionStorage flag, "Don't show again" writes `seen_notification_id` on the
profile. A newer notification has a new id, so it shows again automatically.

**Account deletion.** `/profile` → type username to confirm →
`deleteOwnAccount()` removes the user's files from both buckets through the
storage API (while their policies still apply), calls `rpc('delete_own_account')`,
then signs out.

---

## 10. Server (`server/`)

- `api/spotify/search.get.ts` — `GET /api/spotify/search?q=…`. Fetches a
  client-credentials token with `SPOTIFY_CLIENT_ID/SECRET` from `process.env`,
  caches it in memory, searches tracks, returns raw Spotify JSON. Throttled by
  `utils/rateLimit.ts` per client IP (fixed window, in-memory, resets on cold
  start — good enough to blunt scripted abuse, not a hard guarantee).

Everything else (auth, DB, storage) is Supabase-direct from the browser or
from SSR with the anon key. There is no service-role key anywhere in the app.

---

## 11. Configuration & environment

`nuxt.config.ts` holds: modules, component auto-import rule, `routeRules`
(render mode per path, legacy redirects), `runtimeConfig.public` (the
`NUXT_PUBLIC_*` variables), global `<head>` (meta, OG tags, JSON-LD, favicons),
and `typescript.typeCheck: false`.

Environment variables (see `.env.example`):

| Variable | Where used |
| --- | --- |
| `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY` | `utils/supabase.ts` |
| `NUXT_PUBLIC_SPOTIFY_CLIENT_ID` | `utils/spotifyAuth.ts` (PKCE, public by design) |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | server only, `server/api/spotify/search.get.ts` |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | `auth/TurnstileWidget.vue`; the secret goes into Supabase's dashboard, not the app |

---

## 12. Adding things — checklists

**A new page**
1. Create `app/pages/<name>.vue`; use `<NavBar>` + `.lib-page` or `.gd-page` shell + `<HomeFooter>`.
2. Add a `routeRules` entry in `nuxt.config.ts` (`ssr: false` if it touches browser-only APIs or needs auth).
3. Call `useSeoMeta()`; add to `public/sitemap.xml` if it's public.

**A new table or column**
1. Write the SQL (table, indexes, RLS, grants) as a new "Step 3x" in `SUPABASE_SETUP.md`, plus a migration snippet for existing databases.
2. Add/extend the type in `app/types/index.ts` and the `Db*` interface + mapper in the matching `utils/*Database.ts`.
3. If it's user-visible data, update `/privacy`.

**A new third-party service**
1. Add its env var to `.env.example` and `runtimeConfig` if public.
2. Add it to the providers list in `pages/privacy.vue`.

**A new J-card content field**
1. Add to `JCardContent`, give it a default in `buildBlankJCardContent()` and a migration in `migrateJCardContent()` if older saves need it.
2. Render it in the relevant `parts/*` component (which feeds both preview and printable).
3. Add the control to `JCardSettings.vue`.

---

## 13. Things to know before changing stuff

- **RLS is the security boundary.** The anon key is public; every read/write the client can do is exactly what the policies allow. Never rely on client-side checks alone for anything sensitive (the profanity filter is deliberately client-only and only guards taste, not security).
- **`profiles.is_admin` cannot be set from the client** thanks to column-level grants. Set it in the SQL editor.
- **Deterministic mixtape ids** mean the same local draft always maps to the same cloud row; don't replace this with `crypto.randomUUID()` or retries will duplicate tapes.
- **Printable vs preview** J-card components must stay visually identical; they share the `parts/` components and `inside.ts` for that reason.
- **SSR pages can't use** `localStorage`, `document`, `window`, or the auth session. Wrap browser-only components in `<ClientOnly>` (see `JCardReadOnly.vue`).
- **Fonts are bundled**, not fetched. Adding a font means adding a Fontsource package and an `@import` in `fonts.css`, then listing it in `fontManager.ts` if the designer should offer it.
- **`DEPLOYMENT.md` still references a `nuxt/` subfolder** from the React→Nuxt migration; the app now lives at the repo root, so read it with that in mind.
