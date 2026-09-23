# 3D Cassette Library: Implementation Plan

This file is written for Claude Code. It describes a new 3D view for the Mixtape Creator library, built in stages.

> Repo copy of the original plan (Google Doc `1zuhFnOyU1JB1lCCrrFlSuQmu13RgLqAtMB9oxFEVnjo`). This copy is the
> shared memory between sessions: tick checkboxes and add to the progress log here.

## How to use this file (Claude Code, read first)

1. Read this whole file before writing any code.
2. Work on **one stage per session**. Do not start the next stage until the human has approved the current one.
3. Every stage ends with a **Human checkpoint**. When you reach it: stop, summarise what you built and what you're unsure about, wait for feedback.
4. As you go, tick checkboxes in this file and add a short entry to the **Progress log** at the bottom.
5. When a task says **ASK FIRST**, get explicit approval before doing it (database changes, new paid services, changes to existing features).
6. Never break the existing 2D library. All new work lives behind a feature flag until Stage 8.
7. If a decision in this file turns out to be wrong once you see the real code, don't silently deviate. Propose the change, explain why, and wait.

## Goal

Replace (optionally) the flat library with a 3D scene. Mixtapes stand as cassette cases on a shelf. The user selects a case, and it:

1. comes off the shelf and turns to face them,
2. opens,
3. lets the cassette slide out (the label shows the mixtape name),
4. lets the J-card come out and unfold in 3D, showing the user's existing J-card design.

**Quality bar:** noticeably better than <https://vhs.texs.org/en/jcard>: physically believable plastic and paper, good lighting, crisp text, smooth weighty animation.

## Known context about this repo

- **Stack:** Nuxt 4 + Vue 3 + TypeScript, Pinia, Supabase (auth, DB), @nuxt/ui, Sentry, Vercel.
- **Already installed and relevant:** html-to-image (J-card DOM → textures), pdf-lib (J-card export: source of truth for dimensions), @fontsource/* fonts (textures must wait for them).
- **Existing features to integrate with:** personal library, public profiles at /user/{username}, Explore page, public J-cards, J-card PDF export, admin "What's new" notifications.

## Stage D: Discovery

**Findings** (2026-09-23):

- **Library page & data.** `app/pages/library/index.vue` (moved from `app/pages/library.vue` so `/library/3d` can exist as a sibling route; behaviour unchanged). Mixtapes are *not* in a Pinia store: the page calls `loadMixtapes(userId)` from `app/utils/database.ts` into a local `cloudTapes` ref. Supabase table `mixtapes`: `id, user_id, title, cassette_length (60|90|120), side_a, side_b (jsonb Song[]), created_at, updated_at, is_public, share_token, is_copy`, ordered by `updated_at desc`. The page also shows the unsaved local draft from `useMixtapeStore` (`app/stores/mixtape.ts`), which owns the actions to reuse later: `loadMixtape` (open in editor), `newMixtape`, `togglePublic`, `enableShare`, `save`, `openDesigner(card)`. There is no search or sort on the library page today, so Stage 4's "hook the existing sort and search" has nothing to hook into yet.
- **J-cards are separate records, not a mixtape field.** ⚠ This affects the plan. Table `jcards`: `id, user_id, mixtape_id (nullable), title, content (jsonb JCardContent), is_public, is_copy, copied_from_id`. Loaded through `useJCardLibraryStore` (`app/stores/jcardLibrary.ts`), which merges localStorage and cloud cards. A mixtape can have **zero, one or several** J-cards (`jcard.mixtapeId`), and cards can exist without a mixtape. **Proposal for Stage 2:** show the most recently updated card linked to the tape. When a tape has no card, use a generated default design (from `jcardDefaults.ts`) with the tape title. *Needs human confirmation.*
- **J-card components.** `app/components/jcard/JCardPrintable.vue` (outside face) and `JCardInsidePrintable.vue` (inside face). Both take a single prop, `{ content: JCardContent }`, and are written to mount under a standalone `createApp()`. The PDF export already does that off screen (`snapshotCard` in `app/utils/jcardPdf.ts`), so the texture pipeline can reuse the same approach. Panels are laid out left to right as a flex row: back → spine → flaps 1…N (`content.flaps`, 1–6), with `isReversed` flipping it to `row-reverse`. The parts are in `parts/` (BackPanel, Spine, CoverFlap, ContentFlap, InsidePanel, InsideBackPanel). Extra fold-out panels exist: up to 5 extra flaps beyond the cover, each with an inside face.
- **J-card dimensions (mm)**, from `app/components/jcard/dimensions.ts` (also used by the PDF export). Height **102**. Spine **12.7**. Back **25.4** (full) or **10** (`shortBack`). Flap widths, starting with the cover: **65, 63.5, 61.5, 61.5, 62, 63.5**. `computeWidthMm(content)` gives the total. These replace the plan's defaults (front 63.5 × 101.6, back flap 15.9).
- **Types to reuse.** `Mixtape`, `Song`, `JCard`, `JCardContent`, `CustomFont` in `app/types/index.ts`. Use `migrateJCardContent()` (`utils/jcardDefaults.ts`) before rendering old cards.
- **Images.** Album covers (`Song.albumCover`) come from the Spotify CDN (`i.scdn.co`). J-card images are uploaded to the public Supabase Storage bucket `jcard-images` (with `*ThumbUrl` thumbnails), or kept inline as `data:` URLs when the upload falls back (`utils/supabaseImages.ts`). **CORS couldn't be tested from the build sandbox**: its network policy blocks `i.scdn.co`, and there's no Supabase project configured. The PDF export already runs these images through html-to-image in production, which suggests CORS works. The fetch test is still to do in Stage 2.
- **Fonts.** Fontsource CSS imports in `app/assets/css/fonts.css`: VT323 is the site font, and 9 curated J-card fonts are listed in `CURATED_FONTS` (`utils/fontManager.ts`): Inter, IBM Plex Sans, EB Garamond, Playfair Display, JetBrains Mono, Permanent Marker, Bebas Neue, Caveat, Special Elite. Users can also upload fonts: `content.customFonts` holds them as base64, and `registerCustomFonts` registers them with the FontFace API. The PDF export handles font embedding for html-to-image with `inlineCrossOriginFonts` / `inlineCustomFonts`, and those can be reused.
- **Feature flags / settings.** There was no feature flag mechanism before this work. Related pieces: `runtimeConfig.public` (env-driven), the `profiles.is_admin` column (`useProfileStore().isAdmin`), and `utils/localStorage.ts`.
- **Conventions.** Nuxt 4 `app/` dir. Components are auto-registered **without a path prefix** (`pathPrefix: false`), so component file names must be globally unique. Stores use Pinia setup syntax. Helpers live in `app/utils` and are auto-imported. CSS is mostly global files under `app/assets/css`, with newer components using co-located scoped styles. App pages use `routeRules { ssr: false }`. The app header is the `NavBar` component, rendered by each page (not by the layout). No test runner, linter or type-check step is set up (`typeCheck: false`).

**Human checkpoint:** human confirms the findings before Stage 0. *(The human asked to go straight on to Stage 0.)*

## Architecture decisions

### Libraries

- three (latest stable, currently r186), with addons from `three/addons/...`.
- gsap for all animation timelines.
- lil-gui and stats.js as dev-only tuning tools (loaded only with `?debug=1`).
- **No TresJS.** Plain Three.js in framework-free TS modules, wrapped by one Vue composable. Vue only renders the HTML overlay UI.

### Rendering in Nuxt

- The 3D component is client-only. **Deviation:** it's `Library3D.vue` wrapped in `<ClientOnly>`, *not* a `.client.vue` file. Nuxt's `.client.vue` wrapper ran `onMounted` before template refs were bound, so the canvas container was `null`.
- three is imported dynamically inside `onMounted`. It builds into its own chunk and only the `/library/3d` page chunk references it.
- `routeRules: { '/library/**': { ssr: false } }`.

### Units and scale

1 scene unit = 1 cm. J-card numbers come from the Discovery findings above. Case and cassette defaults:

| Object | Size |
| --- | --- |
| Case (Norelco box) | ≈ 10.9 × 6.9 × 1.7 cm |
| Cassette | ≈ 10.04 × 6.38 × 1.2 cm |
| J-card cover flap | 6.5 × 10.2 cm |
| J-card spine | 1.27 cm |
| J-card back | 2.54 cm (or 1.0 cm short) |

### File layout (as built)

```
app/pages/library/3d.vue                  # route, behind feature flag
app/components/cassette3d/Library3D.vue   # mounts canvas + overlay (inside <ClientOnly>)
app/components/cassette3d/Overlay.vue     # (Stage 3+) Vue UI on top of the canvas
app/composables/useCassetteScene.ts       # bridge: Vue <-> scene
app/utils/featureFlags.ts                 # isLibrary3DEnabled()
app/lib/cassette3d/
  scene.ts            # renderer, camera, lights, env map, resize, render loop, dispose
  states.ts           # TAPE_STATES (moves into tapeMachine.ts in Stage 3)
  debug.ts            # debug hooks
  dimensions.ts       # (Stage 1)
  quality.ts          # (Stage 7)
  objects/…  textures/…  animation/tapeMachine.ts  interaction/picking.ts   # later stages
scripts/screenshot-3d.mjs                 # Playwright screenshots + leak check
```

### Tape state machine

`onShelf → pulledOut → presented → lidOpen → cassetteOut → jcardOut → jcardUnfolded`

- Each transition is one GSAP timeline and must be reversible.
- Input during an animation is queued, or reverses the current timeline if it points backwards. Never leave objects in-between.
- The state machine is the only thing allowed to move tape objects.

### Debug hooks

- `?debugState=<state>&tape=<id>` jumps straight to a state with no animation. *(Parsed and recorded. Nothing moves until Stage 3.)*
- `?debug=1` shows lil-gui and stats.
- In dev only, `window.__cassette3d` exposes `goTo(state)`, `setTape(id)`, `getState()`, `getTape()`, `renderer`, and `info()` (a serialisable `renderer.info` snapshot). `window.__cassette3dLastDispose` records renderer memory after the last unmount.

### Self-verification with screenshots

`npm run screenshot:3d` (with `npm run dev` running). It uses headless Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader` and saves to `.screenshots/` (git-ignored). Screenshots don't capture motion or feel; the human judges timing.

Running locally without a Supabase project: start dev with dummy values, otherwise app init fails:
`NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NUXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run dev`.

## Stage 0: Groundwork

- [x] Install three, @types/three, gsap, and dev-only lil-gui and stats.js (plus playwright-core for the screenshot script).
- [x] Feature flag. **Approved mechanism:** `runtimeConfig.public.library3d` (`NUXT_PUBLIC_LIBRARY3D=true`, default off), plus a `?3d=1` query override for a single visit. When it's off, `/library/3d` redirects to `/library`.
- [x] Route and a client-only component with a canvas filling the area below the app header.
- [x] scene.ts: WebGLRenderer (antialias), SRGBColorSpace, ACESFilmicToneMapping, soft shadows, pixel ratio capped at 2, ResizeObserver, render loop that pauses while the tab is hidden. *Note:* r186 removed `PCFSoftShadowMap`, and `PCFShadowMap` is now the soft, filtered option.
- [x] RoomEnvironment env map, one shadow-casting key light, a shadow-only floor. A temporary case-sized placeholder box gives the shadows something to show; Stage 1 replaces it.
- [x] Debug hooks and the Playwright screenshot script.
- [x] Dispose everything on unmount (geometries, materials, textures, env target, shadow map incl. its depth texture, renderer + `forceContextLoss`), and handle `webglcontextlost` / `webglcontextrestored`.

**Acceptance:**

- [x] The route shows a lit empty scene (see `.screenshots/stage0-*.png`).
- [x] Navigating away and back doesn't leak. Over 3 cycles, dispose leaves 0 geometries and 0 canvases, and the re-mount matches the baseline (2 geometries, 4 textures). One texture always remains: three's module-level DFG lookup table, shared across renderers and never disposed by three. It's expected, and it goes away with the context.
- [x] Other pages' bundles don't include three. In the production build, three sits in its own ~540 kB chunk that only the `/library/3d` page chunk imports, and only dynamically.

**Human checkpoint.** ✅ Approved 2026-09-23.

## Stage 1: The physical objects

Build the geometry procedurally in code, so every dimension stays editable in dimensions.ts.

- [x] **Reference photos.** The human shared 6 photos in the Stage 0 session. They weren't committed (other people's product shots), so the notes below are the record:
  - **Closed case (front / spine / back):** a thin clear-plastic border frames the J-card cover on the lid. The J-card spine shows through the case's hinge-side edge. On the back, the J-card back panel (tracklist) wraps behind the cassette over roughly the last third, and the cassette hubs and window show through the clear tray.
  - **Open case:** the lid opens about 100–110°. The J-card sits in the lid, held by two small clips on the lid's inner face; the tray is the deep half.
  - **Unfolded J-card + seated cassette:** fold order cover → spine → back → extra panel. The cassette sits flat in the tray, with small retaining ribs and guide tabs at the tray's open end.
  - **Hinge (empty clear case, open ~90°):** the hinge is **two short round pins**, one at each end of the long hinge edge, not a full-length barrel. The lid's short end tabs sit on the *outside* of the tray's end walls, and the pins go through both. The pivot axis is the line between the two pins, about 3–4 mm in from the hinge edge (an estimate; the human checks it at the checkpoint), not the outer corner. A narrow upright strip along the hinge edge is the spine window. Inside the tray: two cross-shaped spindle posts that go into the cassette hubs, small cassette-retaining ribs, and snap nubs on the top edge that keep the case closed.
  - **Look references:** a dark smoky cassette shell seen through a clear case. A studio render with crisp specular highlights on the plastic edges against a dark backdrop sets the lighting bar. One loose white cassette shows the label area, window, hubs and bottom edge.
- [ ] **Case base.** Tray with walls, two spindle posts, ribs. RoundedBoxGeometry / ExtrudeGeometry with bevels.
- [ ] **Case lid.** Separate group, pivot exactly on the hinge axis. Model the hinge knuckles.
- [ ] **Cassette shell.** Screw holes, tape window, two toothed hubs, visible tape, label recess, write-protect tabs.
- [ ] **Case plastic material.** MeshPhysicalMaterial, transmission ≈ 1, low roughness, small thickness, IOR ≈ 1.5. Smoky-tint variant.
- [ ] **Cassette shell material.** Satin black, MeshStandardMaterial, roughness ≈ 0.5.
- [ ] **J-card placeholder.** Hinged panels in jcard.ts, plain paper. Each fold is a Group pivot at the crease, next panel parented to it.
- [ ] **Hero view.** Default camera and turntable for inspecting a closed case. (Stage 0's camera crops the placeholder on narrow phones; fit the framing to the aspect ratio here.)

**Acceptance:** closed case with cassette and placeholder J-card, screenshotted from front, spine side, and 3/4.

**Human checkpoint:** does it look like a real cassette case?

## Stage 2: Texture pipeline

### J-card texture (jcardTexture.ts)

- [ ] Mount the existing J-card component offscreen at ~300 dpi of physical size (fixed-position, moved off screen, not `display: none`).
- [ ] Wait for images and `document.fonts.load(...)` for every font used; convert with html-to-image `toCanvas`; unmount.
- [ ] UV regions per panel (front, spine, back flap, extra panels); both sides when there's an inside face, otherwise plain paper back.
- [ ] Texture: SRGBColorSpace, max anisotropy, mipmaps.

### CORS

- [ ] If any image source lacks CORS headers, propose a fix (likely a Nuxt server image proxy). **ASK FIRST.**

### Cassette label (labelTexture.ts)

- [ ] 2D canvas: mixtape name, A/B marks, cassette-label style (ruled lines, stripe band). Colours/font from the J-card where possible.

### Spine texture

- [ ] Crop the spine region from the J-card texture at low resolution, for the shelf.

### Caching (**ASK FIRST**: Storage bucket + DB column)

- [ ] Proposal: render the J-card image once on save, upload to Supabase Storage, store URL + version on the row. Until approved, generate at runtime with an in-memory cache.

**Acceptance:** for 3 real mixtapes, correct J-card on the lid, readable spine, correct label; sharp text at hero distance.

**Human checkpoint.**

## Stage 3: Single-tape interaction

- [ ] tapeMachine.ts: presented → lidOpen → cassetteOut → jcardOut → jcardUnfolded and back.
- [ ] Lid opens ~100–110° with slight overshoot and settle.
- [ ] Cassette lifts off spindles, slides out, rotates to face camera.
- [ ] J-card slides from the lid to a reading position.
- [ ] J-card unfolds panel by panel with staggered timing.
- [ ] Raycast clicks on lid / cassette / J-card; hover cursor + subtle highlight.
- [ ] Overlay buttons for the same actions plus Back (keyboard / screen readers).
- [ ] Limited OrbitControls in jcardUnfolded (clamped, damped); reset on leave.
- [ ] prefers-reduced-motion → short fades or instant cuts.
- [ ] All durations/eases in one config object, tweakable in lil-gui.

**Acceptance:** every state screenshotted; a Playwright test spams transitions and checks `getState()` + screenshot.

**Human checkpoint:** timing and feel on desktop and phone.

## Stage 4: The shelf

- [ ] Wooden shelf with rows, CC0 wood texture (1k).
- [ ] Load the user's mixtapes via the existing data layer.
- [ ] InstancedMesh cases; spines from an atlas via per-instance UV offsets (`onBeforeCompile`).
- [ ] Layout spine-out, left to right; propose an approach for large libraries.
- [ ] Hovered case slides out a few mm.
- [ ] Selection swaps the instance for a hero tape; onShelf → pulledOut → presented with camera fly-in; reversible.
- [ ] Hook library sort/search (none exists today; see Discovery).
- [ ] Empty state with a prompt to create a mixtape.

**Acceptance:** ~150 seeded tapes render in a handful of draw calls; hover/select/return work.

**Human checkpoint.**

## Stage 5: App integration

- [ ] Overlay: title, side A/B track counts and durations.
- [ ] Actions calling existing functions: Edit, Export PDF, Share, Copy (public tapes).
- [ ] 2D/3D toggle; remember choice (**ASK FIRST**: localStorage or profile column).
- [ ] Deep link `/library/3d?tape=<id>`.
- [ ] Shelf takes mixtapes as a prop for later reuse on /user/{username} and Explore (only wire in if approved).

**Acceptance:** everything doable in the 2D library is reachable from 3D.

**Human checkpoint.**

## Stage 6: Visual and audio polish

- [ ] CC0 HDRI (≤ 1k) replaces RoomEnvironment.
- [ ] Scratches/fingerprint roughness map on the case.
- [ ] Paper grain (normal + roughness) on the J-card.
- [ ] Contact shadows; faked AO on the shelf (no SSAO on mobile).
- [ ] Optional: paper-curl vertex bend, if hinged folds feel too stiff.
- [ ] Optional: subtle DOF, desktop high tier only.
- [ ] Sound hooks (case click, cassette clack, paper unfold) via Web Audio; mute toggle with saved preference. Human supplies CC0 audio.

**Acceptance:** side-by-side screenshots against vhs.texs.org.

**Human checkpoint.**

## Stage 7: Performance and robustness

- [ ] quality.ts tiers (GPU info, DPR, memory, frame-time probe):

| Setting | High | Mid | Low |
| --- | --- | --- | --- |
| Case plastic | full transmission | cheaper physical | plain transparent |
| Shadows | on | reduced | off |
| J-card texture | 2048 px | smaller | smaller |
| Pixel ratio cap | 2 | lower | lower |
| DOF | on | off | off |

- [ ] Full-res J-card textures only on selection; free on deselect.
- [ ] Rebuild the scene on context loss; no WebGL → redirect to 2D with a notice.
- [ ] Sentry errors tagged `feature: library3d`.
- [ ] Leak test: 20 enter/leave cycles, memory back to baseline (`CYCLES=20 npm run screenshot:3d`).
- [ ] Bundle size check.

**Acceptance:** leak test passes; `?tier=low` forces a tier.

**Human checkpoint:** real devices (mid-range Android, iPhone, desktop Safari/Chrome/Firefox).

## Stage 8: Launch

- [ ] Strip debug-only code from production (keep query-param debug behind a dev check).
- [ ] Flag on for everyone, or opt-in (human decides).
- [ ] Draft the "What's new" text for the admin panel.
- [ ] README feature line + short 3D architecture section.

**Human checkpoint:** final sign-off.

## Things that need the human

- Reference photos of a real cassette case (Stage 1).
- Which J-card to show for a tape with several / none (Stage 2, see Discovery).
- Approving database/storage changes, image proxying, preference storage (Stages 2 and 5).
- Judging animation timing and feel (Stages 3 and 6).
- Sourcing sound effects (Stage 6).
- Testing on real phones and browsers (Stage 7).
- Launch decisions (Stage 8).

## Progress log

- **2026-09-23 · Stage D + Stage 0.** Discovery written up above. Stage 0 built: deps, feature flag (runtime config + `?3d=1`, approved), `/library/3d` route (moved `library.vue` → `library/index.vue`), `scene.ts`, debug hooks, `scripts/screenshot-3d.mjs`. Verified with headless screenshots, a 3-cycle leak check and a production build. **Open questions:** which J-card a tape shows (several/none linked); CORS still untested against the real CDNs; there is no library search/sort for Stage 4 to hook into.
- **2026-09-23 · Stage 0 approved.** Human shared reference photos (notes under Stage 1). Stage 1 starts in a new session.
