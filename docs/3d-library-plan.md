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
- **J-cards are separate records, not a mixtape field.** ⚠ This affects the plan. Table `jcards`: `id, user_id, mixtape_id (nullable), title, content (jsonb JCardContent), is_public, is_copy, copied_from_id`. Loaded through `useJCardLibraryStore` (`app/stores/jcardLibrary.ts`), which merges localStorage and cloud cards. A mixtape can have **zero, one or several** J-cards (`jcard.mixtapeId`), and cards can exist without a mixtape. **Decided (human, 2026-09-23):** the 3D viewer is only for mixtape + J-card pairs, so the shelf shows only mixtapes that have at least one linked J-card. Tapes without one are left out, and no default card is generated. If the data has several cards linked to one tape, use the most recently updated one (an assumption: the human has not ruled on that case yet).
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
app/pages/user/[username]/3d.vue          # a user's public shelf (Stage 5), same flag
app/components/cassette3d/Library3D.vue   # mounts canvas + overlay (inside <ClientOnly>)
app/components/cassette3d/Overlay.vue     # buttons for every tape action + Back, live region, Escape
app/composables/useCassetteScene.ts       # bridge: Vue <-> scene
app/composables/useHeroTapeData.ts        # what goes on the shelf (yours / samples / ?seed=) + deep link
app/utils/jcardRenders.ts                 # Supabase side of stored renders + render-after-save
scripts/test-render-cache.mjs             # render cache end to end against a mocked Supabase
app/utils/featureFlags.ts                 # isLibrary3DEnabled()
app/components/cassette3d/TapePanel.vue   # the selected tape's details + actions (Stage 5)
app/components/cassette3d/LibraryViewToggle.vue  # 2D | 3D switch, remembered in localStorage
scripts/test-library3d-app.mjs            # Stage 5 end to end against a mocked Supabase
public/3d/hdri/studio.exr                 # CC0 studio HDRI, 512 × 256 EXR (Stage 6); public/3d/CREDITS.md
public/3d/sounds/                         # the CC0 sound files, once chosen (Stage 6; see CREDITS.md)
app/lib/cassette3d/
  scene.ts            # renderer, camera, lights, HDRI env map, shadow focus, resize, render loop, dispose
  contactShadows.ts   # soft contact shadows under the hero tape (Stage 6)
  audio.ts            # sound cues on Web Audio: files from public/3d/sounds/, synthesised stand-ins (Stage 6)
  library.ts          # shelf + hero: selection, search/sort, hover, camera blend, spines (Stage 4)
  shelf/
    layout.ts         # where every case stands: bays of 4 rows, filled top-left first
    shelfModel.ts     # wood bookcase + instanced cases (contents with atlas spines, plastic)
    shelfView.ts      # shelf camera: fit to height, pan along the bays, zoom, drag / wheel / pinch
    spineAtlas.ts     # every spine in one texture, a cell per tape
  animation/
    config.ts         # every duration, ease and pose of the tape machine (live-editable in ?debug=1)
    tapeMachine.ts    # TAPE_STATES + the state machine (Stage 3)
  interaction/
    picking.ts        # hover glow + click actions on case / cassette / J-card
  debug.ts            # debug hooks
  dimensions.ts       # every physical dimension (cm) + where things sit in the case
  materials.ts        # case plastic (clear / smoke), shell, paper, label, …
  hero.ts             # one tape on the hero turntable; setTape() textures it (Stage 2)
  heroView.ts         # hero camera framing + turntable (drag to spin / tilt)
  tapeData.ts         # TapeData (mixtape + J-card), pairing, cache key
  fixtures.ts         # 3 sample tapes for dev/screenshots (?fixture=1|2|3)
  textures/
    jcardSnapshot.ts  # J-card DOM → canvases (printable components + html-to-image)
    jcardTexture.ts   # canvases → per-panel textures on the hinged card
    labelTexture.ts   # cassette labels on a 2D canvas
    jcardRender.ts    # stored renders: content hash, encode, load back, URL check
    snapshotSource.ts # memory → stored render → render here (+ upload if yours)
    snapshotCache.ts  # in-memory LRU of snapshots, keyed by card id + content hash
    spineTexture.ts   # shelf spines drawn from the card's spine text / colours / fonts
    woodTexture.ts    # procedural wood grain (stand-in for a CC0 photo texture)
    surfaceTextures.ts # procedural case scuffs + fingerprints, paper grain normal/roughness (Stage 6)
  objects/
    geometry.ts       # extrusion helpers (profiles along Y, shapes along Z)
    caseModel.ts      # tray + lid on the hinge axis
    cassette.ts       # cassette shell, window, hubs, tape, screws, labels
    jcard.ts          # J-card as hinged panels
    tape.ts           # case + cassette + J-card assembled
  quality.ts          # (Stage 7)
scripts/screenshot-3d.mjs                 # Playwright screenshots + leak check
```

### Tape state machine

`onShelf → pulledOut → presented → lidOpen → cassetteOut → jcardOut → jcardUnfolded`

- Each transition is one GSAP timeline and must be reversible.
- Input during an animation is queued, or reverses the current timeline if it points backwards. Never leave objects in-between.
- The state machine is the only thing allowed to move tape objects.

### Debug hooks

- `?debugState=<state>&tape=<id>` jumps straight to a state with no animation. `?motion=reduce` forces the reduced-motion path.
- `?debug=1` shows lil-gui and stats. Stage 1 added folders for the tape (view, turntable, lid angle, J-card fold, flap count, short back) and for the case plastic and shell materials.
- Hero inspection (Stage 1): `?view=front|threeQuarter|spine|back|threeQuarterBack`, `?case=smoke`, `?flaps=1–6`, `?shortBack=1`, `?lid=<deg>`, `?fold=<0–1>`, `?turntable=0`.
- Shelf (Stage 4): `?seed=<n>` fills the shelf with n generated tapes (dev only; `?seed=0` = the empty shelf). `?debugState=onShelf|pulledOut|…` works with any tape source; with no `?tape=`, the first tape is the one taken off the shelf.
- Stage 6: `?debug=1` → Renderer has env rotation and a Contact shadows folder; Case plastic has scuff roughness; Paper has grain strength.
- In dev only, `window.__cassette3d` exposes `goTo(state)`, `setTape(id)`, `getState()`, `getTape()`, `renderer`, and `info()` (a serialisable `renderer.info` snapshot). Stage 1 added `setView`, `setElevation`, `setAutoRotate`, `setLidAngle`, `setJCardFold`, `setJCardLayout(flaps, shortBack)`, `setCaseTint` and `setPartsVisible({ case, cassette, jcard })`. Stage 4 added `selectTape(i)`, `highlightTape(i)`, `setShelfView(search, sort)`, `getShelfInfo()`, `setShelfPan(x, y)`, `setShelfZoom(z)`, `spineScreenPosition(i)` and `scene`. Stage 6 added `environment()` ('hdri' or 'room'), `sounds()` (the cue log), `isMuted()` and `tuning` (the live `SURFACE`, `CONTACT_SHADOWS` and `ENVIRONMENT` objects). `window.__cassette3dLastDispose` records renderer memory after the last unmount.

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
  - **Second photo set (2026-09-23, a C418 case):** opened flat, the cassette lies on the J-card in the **flat lid** half, with the J-card spine at the hinge and the back flap (barcode) over the cassette's hinge-side third. The **deep** half carries the two spindle posts and comes away empty. At 90° open, the J-card (cover, spine, back) and the cassette all stand up with the lid. Closed, the cover shows through the flat lid. So the J-card and the cassette ride with the lid.
  - **Look references:** a dark smoky cassette shell seen through a clear case. A studio render with crisp specular highlights on the plastic edges against a dark backdrop sets the lighting bar. One loose white cassette shows the label area, window, hubs and bottom edge.
- [x] **Case base.** Tray with walls, two spindle posts, ribs. The long parts are cross-section profiles extruded along the case (ExtrudeGeometry, rounded corners, creased normals). Also: cross-shaped spindle posts, floor ribs kept clear of the J-card back flap, guide tabs, snap nubs, and hinge pins through the end walls.
- [x] **Case lid.** `lidPivot` sits exactly on the pin axis, 3.5 mm in from the hinge edge and 3.5 mm down from the lid's top face. `setLidAngle(deg)`. The lid's hinge edge is a quarter-round knuckle centred on that axis, and the tray's spine window and end walls are cut back along the circle it sweeps, so the lid opens to 105° without passing through the tray. End tabs: a band along the top of each short end that widens into a round ear round the pin. Two J-card clips on the lid's inner face.
- [x] **Cassette shell.** Solid core between two thin face plates that leave the label area recessed. Screw holes (with recessed screws), window with clear panes, two toothed hubs, brown tape pack, tape running past the head openings (plus the felt pad), raised trapezoid, and write-protect tabs in their pockets. Label meshes for side A and side B are ready for Stage 2 textures.
- [x] **Case plastic material.** MeshPhysicalMaterial, transmission 1, roughness 0.02, thickness 0.12, IOR 1.5, `FrontSide`: the parts are closed solids, and double-sided transmission sampled the J-card twice and blurred it. Smoky variant via attenuation (`?case=smoke`).
- [x] **Cassette shell material.** Satin black MeshStandardMaterial, roughness 0.5; the trapezoid is slightly glossier (0.32).
- [x] **J-card placeholder.** Hinged panels in `objects/jcard.ts`, plain paper. The chain starts at the cover: spine and back fold 90° + 90° into a J, and extra flaps concertina behind the cover (180°, alternating). `setFold(0…1)`; Stage 3 drives the hinges one by one.
- [x] **Hero view.** The case stands on its short end on a turntable under a fixed key light, so the highlights move across it. Framing fits the case at any turntable angle and any aspect ratio (checked at 1280×800 and 390×844). Drag to spin (with inertia) or tilt; any drag stops the auto-spin.

**Acceptance:**

- [x] Closed case with cassette and placeholder J-card, screenshotted from front, 3/4, spine, back, 3/4 back, from above (the cross-section), with the lid open, smoky, and on a phone. The cassette and the folding J-card also get shots on their own. `npm run screenshot:3d` → `.screenshots/hero-*.png`.
- [x] The leak check still passes. Transmission added one texture that three.js never frees: its transmission render target, which not even `renderer.dispose()` releases. `scene.ts` now disposes it.
- [x] three is still only in its own chunk (≈576 kB), which the `/library/3d` page chunk loads only dynamically.

**Known issues / open questions for the checkpoint:**

- **Hinge geometry is a best guess** from the photo notes. Tray owns the upright spine window; lid = front plate + quarter-round knuckle; pins 3.5 mm in. Where the J-card's cover/spine crease meets the knuckle, the square card corner pokes about 0.5 mm into the rounded plastic. It's invisible from normal angles; paper crease rounding (Stage 6) would remove it.
- **Everything is squeezed a little.** The plan's case depth (17 mm), the J-card spine (12.7 mm) and the cassette (12 mm) leave ~0.5 mm, so with **4 or more flaps** the concertina stack behind the cover overlaps the cassette's top face by up to 0.4 mm. Can't be seen when closed. If it matters, the fix is a slightly deeper case or thinner card (0.2 mm now).
- ~~The J-card's spine and back flap swing with the lid and sweep through the cassette.~~ Fixed: the cassette rides in the lid too (second photo set).
- **Thin light seams** show along a few plastic edges at some angles. They come from transmission on very thin slivers, and Stage 6's HDRI/roughness work is the place to tune them.
- **The paper is flat and bright** because it has no texture yet. Stage 2 gives the J-card and the label their real textures.
- The hero case draws in ~100 draw calls. That's fine for one tape; the shelf (Stage 4) uses instancing.

**Human checkpoint:** does it look like a real cassette case? ✅ Approved 2026-09-23.

## Stage 2: Texture pipeline

### J-card texture (jcardTexture.ts)

- [x] Mount the existing J-card component offscreen at ~300 dpi of physical size (fixed-position, moved off screen, not `display: none`). Both faces use `JCardPrintable` / `JCardInsidePrintable`, the same components and html-to-image path as the PDF export. That's why `jcardPdf.ts` now *exports* its font/image helpers (`inlineCrossOriginFonts`, `inlineCustomFonts`, `collectImageUrls`, `waitForImages`), with no behaviour change.
- [x] Wait for images and `document.fonts.load(...)` for every font used; convert with html-to-image `toCanvas`; unmount. Families are read from the card HTML's `font-family` styles. Uploaded fonts are registered first (`registerCustomFonts`). Each family gets a 4 s timeout, and the result says which ones loaded.
- [x] UV regions per panel (front, spine, back flap, extra panels); both sides when there's an inside face, otherwise plain paper back. Each face is uploaded once as one texture. Each panel shows its columns through a texture clone with its own offset/repeat; clones share the upload. A face wider than the GPU's texture limit (a 6-flap card is ~4900 px wide) is scaled down to fit. Panel pixel ranges are measured from the laid-out DOM, so reversed cards and the mirrored inside need no special cases. (A first version cropped each panel into its own canvas; that took seconds per card on software-rendered canvases.)
- [x] Texture: SRGBColorSpace, max anisotropy, mipmaps.

### CORS

- [ ] If any image source lacks CORS headers, propose a fix (likely a Nuxt server image proxy). **ASK FIRST.** Before capture, every image is now fetched with `mode: 'cors'`, and failures are reported (texture report, console warning, and a FAIL in the screenshot script). **Still untested against the real hosts:** the sandbox can't reach `i.scdn.co` or a Supabase project. To test, open `/library/3d?3d=1&tape=<id>` signed in and run `__cassette3d.getTextureReport().images` in the console (dev build).

### Cassette label (labelTexture.ts)

- [x] 2D canvas: mixtape name, A/B marks, cassette-label style (ruled lines, stripe band). Colours/font from the J-card where possible. The title uses the cover's first font (fallback Permanent Marker) and shrinks, then ellipsises, to fit. The stripe uses the card's background colour unless it's near white or near black (fallback red). Also: the tape length, and STEREO in the small print. Label UVs now span the label area 0–1.

### Spine texture

- [x] Crop the spine region from the J-card texture at low resolution, for the shelf. It's `spineThumbnail` (256 px tall) on the texture set; Stage 4 packs these into the atlas.

### Caching (**ASK FIRST**: Storage bucket + DB column)

- [x] Proposal: render the J-card image once on save, upload to Supabase Storage, store URL + version on the row. Until approved, generate at runtime with an in-memory cache. **Approved and built (2026-09-23).** Migration: `SUPABASE_SETUP.md` step 3k, which adds a nullable `jcards.render jsonb` and a public `jcard-renders` bucket with owner-folder write policies. **Not yet run on the real project.**
  - **Version = content hash**, not `updated_at`: `updateJCard` saves content without touching `updated_at`, and Postgres reorders jsonb keys, so the hash is taken over key-sorted JSON (plus a pipeline version, now `r2`; bump it when rendering changes).
  - **After a save:** the editor (and the library's "save to cloud") calls `scheduleJCardRender`. Once edits have been quiet for 8 s, in idle time, one render at a time, it checks the stored version, renders, uploads `{user}/{card}/{hash}-{outside|inside}.webp` (1-year cache), writes `render` to the row, and deletes older versions. Leaving the editor flushes pending renders. Renders with failed images are not stored. If the column or bucket is missing, it stops for the session.
  - **In the 3D view:** memory cache → stored render (only when the hash matches and the URLs are in our own bucket) → render in the browser. When a card you own had to be rendered in the browser, it uploads the result for next time (write-back). Report fields: `origin` (memory/stored/runtime), `version`, `writeBack`.
  - **Cleanup:** deleting a card removes its renders; account deletion removes the user's `jcard-renders/` folder.
  - **Tested** end to end against a mocked Supabase (`npm run test:render-cache`, 20 checks). Covered:
    - runtime render + owner upload, then the stored render used in a fresh tab
    - an edited card re-rendered, with the old files deleted
    - someone else's card never uploaded, and a foreign URL ignored
    - the editor storing a render ~9 s after Save
  - Loading a stored render took ~25 ms here vs 5–10 s to render the card in this GPU-less browser.
  - Runtime cache: an LRU of 6 snapshots keyed by card id + content hash survives leaving and re-entering the route (~40 ms).

**Which tape shows (until the shelf):** `?fixture=1|2|3` (built-in samples); `?tape=<mixtape id>` (yours, signed in); otherwise your most recently updated mixtape that has a J-card; otherwise sample 1. Dev hooks: `__cassette3d.loadFixture(n)`, `showTape({ mixtape, jcard })`, `getTextureReport()`.

**Acceptance:** for 3 real mixtapes, correct J-card on the lid, readable spine, correct label; sharp text at hero distance.

- [x] With the 3 **fixtures** (`.screenshots/tape{1,2,3}-*.png`): the J-card is on the lid, the spine reads, the back flap shows through the tray, and labels A/B are correct. The cover close-up is sharp. Flat outside/inside shots check panel mapping, including a continuous background running across panels and the mirrored inside face. The script checks each fixture: textures ready, every font loaded, every image fetched with CORS, and the cache hit.
- [x] With **real mixtapes**: signed off on 1 real card (below). Two more cards and the real background images are deferred to the end of development (human decision).
  - **Real card 1** ("Yell along songs", 2 flaps, bleed, two uploaded fonts, background photos outside and inside). The human pasted its content JSON; it's kept out of git and rendered locally through `showTape`. Results:
    - Both uploaded fonts (TTF and OTF) load and render: cover, spine, track list.
    - The panels map correctly outside and inside. The inside is blank as expected: its only text sits in flap 3, left over from when the card had more flaps, and the 2D print doesn't show it either.
    - The two background photos could not be checked, because this sandbox's proxy blocks the Supabase host (403). With them missing, the white text sits on the cream background, as it would in the PDF. With a dark stand-in image in their place, everything reads.
    - **Cut guides** (`showCutGuides`) showed up as red dashed lines on the 3D card. **Human decision:** hide them in 3D. Done: the 3D render always turns them off, and the pipeline is now `r2`, so renders already stored with guides get redone.

**Known issues:**

- **Reversed cards** (`isReversed`) put every panel's own artwork on the right panel, but the 3D card still folds the normal way. A background that runs across panels therefore won't line up at the creases on a reversed card.
- A faint light line can show along some creases when the card lies flat (panel edge faces).
- A snapshot takes 0.5–4 s in headless Chromium without a GPU, with the most time going to font embedding. The stored-render cache removes that for any card that has been saved since step 3k was run.

**Human checkpoint.**

## Stage 3: Single-tape interaction

- [x] tapeMachine.ts: presented → lidOpen → cassetteOut → jcardOut → jcardUnfolded and back.
  - **How it works:** a state is a set of numbers (turntable angle, lid angle, how far the cassette and the J-card are out, unfold progress, camera rig), and every frame each pose is worked out from those numbers. A transition is one GSAP timeline that tweens the numbers. Going back plays that same timeline in reverse, and a jump just sets the numbers, so nothing can be left half-way.
  - **Parenting:** the cassette and J-card stay children of the lid; their "out" poses are computed in world space and converted into the lid's frame each frame.
  - **Input:** a request while animating keeps going if it points further along, or turns the running timeline round if it points back. Requests further than one step walk there step by step.
  - **Resting in `presented`**, the turntable (auto-spin, drag) and the Stage 1 debug hooks own the tape. Leaving, the machine takes over from wherever the turntable was.
  - **Not yet:** `onShelf` / `pulledOut` come with the shelf (Stage 4), and count as `presented` until then.
- [x] Lid opens ~100–110° with slight overshoot and settle: 105°, `back.out(1.6)`. At the same time the case turns −35°, so you see it like an open book with both halves visible.
- [x] Cassette lifts off spindles, slides out, rotates to face camera. It lifts 2.2 cm straight out of the lid, then arcs to face the camera, side A towards you.
- [x] J-card slides from the lid to a reading position. The cassette first moves aside to lie on the table, label up. The J-card then lifts out and arcs to the front, still folded as a J.
- [x] J-card unfolds panel by panel with staggered timing. Each crease starts 45 % of its swing after the previous one (spine, back, then extra flaps). The card slides so it stays centred as it widens, and the camera pulls back to fit its full width.
- [x] Raycast clicks on lid / cassette / J-card; hover cursor + subtle highlight. A press without a drag counts as a click. The hovered part gets a pointer cursor and a faint warm glow on its materials. What each part does depends on the state:
  - closed case: opens it
  - open: the cassette comes out, the J-card comes out (the cassette leaves first), the case closes
  - …and so on back through the states.
- [x] Overlay buttons for the same actions plus Back (keyboard / screen readers). Keyed on where the tape is *heading*, so they respond mid-animation. Escape = Back, and an `aria-live` line announces each state. Unfolded, there's also **Turn over**, which spins the card itself to show its inside.
- [x] Limited OrbitControls in jcardUnfolded (clamped, damped); reset on leave. Polar 25°–110°, azimuth ±70° (never behind the card, into the case), zoom 0.45–1.4×, damping, no pan. On leave, the camera blends back to the rig (0.45 s) and a turned-over card turns back first.
- [x] prefers-reduced-motion → short fades or instant cuts. The view fades out (140 ms), cuts to the target state and fades in; turning the card over is instant.
- [x] All durations/eases in one config object, tweakable in lil-gui. That's `animation/config.ts`. `?debug=1` → **Tape machine** has buttons for each state, plus a Timing folder (turn, lid duration/delay/ease, cassette, J-card, unfold duration + stagger). Changes apply from the next transition.

**Acceptance:**

- [x] Every state screenshotted, both jumped to (`state-*.png`) and animated to (`machine-*.png`). Also: mid-open, after the spam test, and the card turned over.
- [x] Playwright (in `npm run screenshot:3d`). Each check waits until the tape is at rest, then confirms `getState()` is right and every animated number is exactly at that state's value (`poseError() === 0`). It covers:
  - animated walk forward, then all the way back in one request
  - reversal mid-animation
  - **spam test**: 80 random requests / steps at random moments (`SPAM=80`); it must settle exactly on the last target
  - overlay button, Escape, a real mouse click on the case
  - turning the card over and folding everything away from there
  - reduced motion
  - The 3-cycle leak check still passes (8 textures per mount, all freed).
- Bugs these tests caught and fixed:
  - Starting a backward step fired `onComplete` immediately.
  - Reversing before the first frame left the machine waiting forever: GSAP doesn't complete a zero-length move.
  - Under automation, GSAP's lag smoothing slows timelines to a crawl on the software renderer. The debug hooks now switch it off when `navigator.webdriver` is set.

**For the checkpoint (timing and feel):**
- **Screenshots can't show motion:** please try it on desktop and phone (`/library/3d?3d=1&debug=1` for the timing sliders).
- **Reversed ease:** the lid's overshoot ease also plays when closing, reversed: it opens a touch wider, then shuts. That comes from reusing one timeline both ways, as the plan asks. If it feels wrong, closing can get its own ease.
- **Clicking the open case closes it.** Is that too easy to trigger by accident?
- **Unfolded view:** the cassette lies on the table beside the card; the open case is hidden behind the card.

**Human checkpoint:** timing and feel on desktop and phone. **Approved 2026-09-24** (as built: the reversed lid ease, click-to-close and the unfolded layout stay as they are).

## Stage 4: The shelf

- [x] Wooden shelf with rows. A bookcase stands on the floor behind the hero turntable (`SHELF` in dimensions.ts): 4 rows per bay, 48 cm bays, 26 cases a row, and all the wood is merged into **one mesh**. **Wood texture: procedural** (`woodTexture.ts`, a 1k tileable grain drawn on a canvas, mapped in world cm). This sandbox's network blocks the CC0 libraries (Poly Haven, ambientCG). Swapping in a CC0 photo texture later only touches that file.
- [x] Load the user's mixtapes via the existing data layer: `loadMixtapes` + the J-card store + `pairTapes` (only tapes with a J-card, as decided). Signed out, the shelf shows the 3 sample tapes with a "Sign in to see your own" note.
- [x] InstancedMesh cases; spines from an atlas via per-instance UV offsets (`onBeforeCompile`).
  - **contents**: one InstancedMesh, a block standing in for the J-card + cassette. Its spine face reads the tape's atlas cell through a per-instance UV rect (`aSpineRect`). Its other faces take the card's background colour (`instanceColor`). A per-instance `aHover` adds the hover glow.
  - **plastic**: one InstancedMesh sharing the same instance matrices. The shelf's cases use a **cheaper plastic than the hero's** (no transmission pass): reflections added on top, plus a touch of dimming.
    - Found on the way: three.js ignores a material's `envMapIntensity` for `scene.environment` and uses `scene.environmentIntensity` instead. So the shelf plastic gets the environment as its own `envMap`, which lets it be dimmed.
    - Without that, RoomEnvironment's ceiling light washed a whole row of spines out to white.
  - **atlas** (`spineAtlas.ts`): 2048 px wide, 35 × 256 px cells. A cell is the case's spine-side face, with the J-card spine where it sits behind the plastic. The atlas height grows with the library; if it hits the GPU's texture limit, the cells halve.
  - **Spines are drawn first, and real ones replace them.**
    - Rendering 150 J-cards to get their spines isn't possible (0.5–4 s each), and downloading 150 full stored renders is too heavy.
    - So every spine is drawn straight away from the card's spine text, colours and fonts (`spineTexture.ts`, no images).
    - A drawn spine is replaced by the real one as soon as there is one: first from the snapshot cache (cards this tab has rendered), else from the **stored spine file** (below), loaded 4 at a time in shelf order. Taking a tape off the shelf upgrades its spine too.
    - The hero case wears the drawn spine too until its own render arrives, so nothing jumps when the tape leaves the shelf.
  - **150 tapes: 6 draw calls** on the shelf (incl. shadows), measured by the script. With a tape on the turntable it's ~150, almost all of it the hero case (as in Stage 3).
- [x] Layout spine-out, left to right; propose an approach for large libraries.
  - **Built:** the shelf fills bay by bay, top row first, left to right. A library bigger than one bay (104 tapes) adds bays to the right, and the shelf camera pans.
  - **Camera:** it fits the bookcase's height and starts top left. A small library (≤ 2 rows) opens zoomed in on its rows.
  - **Controls:** drag pans (with a little inertia), and the wheel or trackpad scrolls along the shelf. Ctrl + wheel and pinch zoom; zoomed in, you can also pan up and down.
  - **Large libraries (proposal):** this holds to ~900 tapes at full spine resolution, in one atlas and 6 draw calls whatever the count.
    - Past that, the atlas halves its cells (blurrier spines). That also caps the instance count at ~2000.
    - If anyone gets near that, the next step is paging by bay: only the bays near the camera get atlas cells and instances, filled as you pan.
    - Search and sort already make big shelves manageable. I'd leave paging until someone has a library that size.
- [x] Hovered case slides out a few mm. 12 mm (a few mm can't be seen head-on), plus a faint glow. The overlay names the tape.
- [x] Selection swaps the instance for a hero tape; onShelf → pulledOut → presented with camera fly-in; reversible.
  - **Tape machine:** `onShelf` and `pulledOut` are real states now, with three more numbers:
    - `pull`: the case slides out of its row
    - `fly`: pulled out → turntable, on an arc, turning to show the cover at −20°
    - `shelf`: the camera blend, shelf ↔ hero rig
  - Same rules as Stage 3: one timeline per step, reversed to go back, and jumps just set the numbers.
  - **The swap:** while the tape is off the shelf, its instance is hidden. The hero tape (on the turntable group) is carried from the slot's exact pose, goes back the same way, and the instance reappears when it arrives.
  - **Camera:** the hero view passes its pose through a filter that blends in the shelf camera. The key light's shadow follows a focus point that blends from tight round the hero (as before) to the part of the shelf in view.
  - The shelf **dims to 30 %** while a tape is on the turntable, so the case isn't competing with 150 spines behind it.
  - Choosing another tape while one is out puts the first one back, then brings the new one out.
  - Going back to the shelf pans the shelf camera so the slot is in view (e.g. for a deep-linked tape in bay 2).
- [x] Hook library sort/search. The 2D library has none, so this lives in the **3D overlay only**. There's a search box (title, song titles, artists) and a sort (recently updated, recently created, title A–Z). The shelf re-flows, and cases glide to their new slots. Adding the same to the 2D library would change an existing feature, so I haven't touched it (ask if wanted).
- [x] Empty state with a prompt to create a mixtape.
  - With no mixtapes: "Your shelf is empty" → **Make a tape** (`newMixtape()`).
  - With mixtapes but no J-cards: → **Design a J-card** (`openDesigner`).
  - Load errors get a retry.
- **Keyboard / screen readers:**
  - A visually hidden list of the tapes on the shelf, in shelf order. Tabbing to one highlights its case (and pans to it), and Enter takes it off the shelf.
  - Escape walks back: presented → pulledOut → onShelf.
  - The live region names the tape.

**Acceptance:** ~150 seeded tapes render in a handful of draw calls; hover/select/return work.

- [x] `?seed=150`: 150 tapes, 2 bays, **6 draw calls**. The script (`npm run screenshot:3d`, screenshots in `.screenshots/shelf-*.png`) checks:
  - hover with a real mouse (the caption names the tape)
  - click → presented, then back → onShelf; reversal mid-flight; swapping tapes
  - Escape step by step
  - search + sort, and a search with no match
  - keyboard focus + Enter
  - a phone viewport
  - a deep link to a tape in bay 2, going back to its slot
  - the empty shelf
  - reduced motion onto and off the shelf
- [x] Stage 1–3 checks still pass. They now start from `?fixture=1` (the sample shelf, with sample 1 presented). The leak check still passes with the shelf.

**Known issues / for the checkpoint:**

- **The wood is procedural**, not a CC0 photo (network). If you'd like a specific CC0 texture (e.g. Poly Haven "wood_table_001", 1k), drop it in `public/textures/` or allow the host, and I'll wire it in.
- ~~**Real spines on the shelf** only appear for tapes this tab has rendered.~~ **Stored spine thumbnails: approved and built (2026-09-24).**
  - Every stored render now also uploads `{user}/{card}/{hash}-spine.webp`: 512 px tall, ~2 kB for a plain card. Its URL goes in the `render` jsonb as `spine: { url, height }`.
  - There's no migration: it's a new key in the existing column, in the same bucket with the same policies. The version cleanup and card deletion remove the spine file with the rest.
  - The shelf loads a spine when the render's hash still matches the card and the URL is in our bucket. It never downloads the full faces for that.
  - **Older renders** (stored before this) get their spine without a re-render. When the owner saves the card, or opens it in 3D, the spine is cropped from the stored images and added to the same render version.
  - The crop code moved to `jcardRender.ts` (three-free), because the editor's save path uses it.
  - `npm run test:render-cache` checks it (26 checks):
    - the spine is stored and linked
    - the shelf loads it (and not the full render)
    - an old render gets backfilled
    - the editor's save stores it
    - old versions' spines are deleted
- The **drawn spine** leaves out images: a spine with a photo background shows its background colour. It uses a card's uploaded font only if that font is on the spine.
- **The shelf plastic** is dimmer than the hero's because of RoomEnvironment's hot ceiling light. Stage 6's HDRI is the place to bring its reflections back. *(Stage 6: brought back up, 0.04 → 0.15.)*
- **Timing / feel to judge:** pull-out 0.5 s, fly-in 1.4 s (3 cm arc), landing angle −20°, hover slide 12 mm + glow, shelf dimmed to 30 % behind the hero. They're all in `ANIM.shelf` / `SHELF`, and in `?debug=1` → Tape machine → Shelf timing.
- After the fly-in, the case doesn't auto-spin (it did before, when it was the only tape on the page). Dragging still turns it.

**Human checkpoint.** ✅ Approved 2026-09-24 ("current shelf looking good"), as built: procedural wood, timing as is, search/sort only in 3D. Step 3k runs on the real project; the spine file needs no extra SQL.

## Stage 5: App integration

- [x] Overlay: title, side A/B track counts and durations. A **tape panel** (`TapePanel.vue`) sits top left while a tape is off the shelf: title, dedication (if any), Side A / Side B as "n tracks · m:ss", the total on its C-length, Public/Private and the last update, and the copy note for unedited copies. On small screens (< 720 × 560) it starts folded to its title bar; the title toggles it.
- [x] Actions calling existing functions. Everything the 2D tape card does, with the same store / database calls and the same toasts and modals:
  - **Edit tape** (`store.loadMixtape`), **Edit J-card** (`store.openDesigner` with the tape's card), **Print J-card (PDF)** (as the J-card library's Print: migrate, register uploaded fonts, `exportJCardToPDF`).
  - **Copy link** (`store.enableShare` + share modal), **Make public / private** (`store.togglePublic`; disabled on unedited copies), **Delete** (confirm, `deleteMixtape`). A deleted tape leaves the shelf straight away (cut back to the shelf).
  - Sample tapes (signed out) only get Print.
  - **Copy (public tapes):** on the public shelf (below), where other people's tapes are.
  - The rest of the 2D library, reachable from the shelf: a **＋ New** menu in the toolbar (New mixtape, New J-card, All J-cards → the 2D J-cards tab, which stays the place to manage cards without a tape), and the **unsaved draft** note ("Unsaved draft: … · Open · Save to cloud"), as the 2D Working Draft section.
- [x] 2D/3D toggle; remember choice. **Decided (human, 2026-09-24): localStorage** (no profile column). `LibraryViewToggle.vue`: a 2D | 3D switch in the 2D library header and in the shelf toolbar, shown only while the flag is on. The choice is `library-view` in localStorage (`getLibraryView` / `setLibraryView` in `utils/localStorage.ts`). With the flag on and 3D remembered, `/library` redirects to `/library/3d`, except for `?tab=` links (e.g. the J-cards tab) and `?view=2d` (the 3D page's "Open the regular library" fallback). A browser without WebGL 2 resets the choice to 2D. The 3D page's breadcrumb is now Home / Library.
- [x] Deep link `/library/3d?tape=<id>`. It already opened a tape on load (Stage 4); now the URL also **follows the selection**: taking a tape out puts its id in `?tape=` (replace, not push, so Back still leaves the library), and putting it back removes it, so a reload or a copied URL comes back to the same tape. Signed out, `?tape=fixture-<n>` works for the samples. A `?tape=` that isn't on the shelf (no J-card, deleted, or signed out) gets a note.
- [x] ~~Shelf takes mixtapes as a prop for later reuse on /user/{username} and Explore.~~ First decided against (2026-09-24), then **changed at the checkpoint (human, 2026-09-24): add a public shelf on the user profile** (not Explore). Built:
  - **Route** `/user/{username}/3d` (client-only, behind the same flag; flag off → the profile page). The profile page moved from `pages/user/[username].vue` to `pages/user/[username]/index.vue` so the route can sit beside it (same URL and route name, behaviour unchanged).
  - **What's on it:** the same data the profile page lists, `loadPublicMixtapesByUser` + `listPublicJCardsByUser`, paired with `pairTapes`: public, non-copy mixtapes that have a public J-card linked. A private profile shows "private" unless it's yours; an unknown username says so. `Library3D` takes a `username` prop, and `resolveShelfTapes` a scope, with the new source `public`.
  - **Tape panel on someone else's tape:** Copy tape to my library, Copy J-card to my library (the existing `useCopyToLibrary`, sign-in gate included), Tape page (`/explore/{id}`), Print J-card. On your own public shelf: Edit tape / Edit J-card instead of the copies. The owner-only actions (share, public, delete) stay in your library.
  - **Shelf toolbar:** "◀ @username" back to the profile instead of the 2D/3D switch and the New menu; no draft note. `?tape=` follows the selection as in the library.
  - **Profile page:** a "View on a 3D shelf" button next to Public Mixtapes, while the flag is on and there's at least one public mixtape. A per-visit `?3d=1` rides along on the links both ways.
  - Stored renders and spines of other people's cards are read like your own (public bucket, hash-checked); nothing is ever uploaded for a card you don't own.

**Acceptance:** everything doable in the 2D library is reachable from 3D.

- [x] `npm run test:library3d` (new, `scripts/test-library3d-app.mjs`, 40 checks) against a mocked Supabase, like the render-cache test. It covers the panel's numbers, Make public/private (row updated, modal, still public after a reload), Copy link (token saved, link on the clipboard), Print (a PDF downloads), Delete (row deleted, the case leaves the shelf), Edit tape / Edit J-card (the editors open with that tape / card), the URL following the selection and a reload returning to it, the missing-tape note, the 2D/3D switch (remembered both ways, `?tab=` exempt, ignored with the flag off), the New menu, the draft note, and the folded panel on a phone. The public shelf: only public tapes with a public card, the toolbar, the panel's copy / page / print actions and no owner actions, Copy tape opening a private copy, unknown and private users, your own public shelf offering Edit, the profile's link, and the flag-off redirect. Screenshots: `.screenshots/app-*.png`.
- One bug found on the way: the shelf toolbar's 2D link couldn't be clicked, because the overlay lets clicks through to the canvas and its scoped CSS didn't reach the child component. Fixed in the toggle itself.

**Checkpoint answers (human, 2026-09-24):** looks good; delete cutting back to the shelf is fine; ignore the dedication for now (the database doesn't store `dedicatedTo`, so cloud tapes never show it); add a public shelf (built on the user profile, above, which also gives Copy for public tapes its place).

**Human checkpoint** for the public shelf. ✅ Approved 2026-09-24.

## Stage 6: Visual and audio polish

- [x] CC0 HDRI (≤ 1k) replaces RoomEnvironment.
  - The sandbox can't reach Poly Haven, but npm works: **@pmndrs/assets** (CC0) packs a set of Poly Haven HDRIs as 512 × 256 EXRs (DWAB). Its `studio` one is in `public/3d/hdri/studio.exr` (110 kB), taken out of the package's base64 module unchanged. It's not a dependency. Source and licence: `public/3d/CREDITS.md`.
  - `scene.ts` loads it with EXRLoader and prefilters it with PMREM. The page waits for it before showing the scene. If it fails to load, RoomEnvironment stands in (`__cassette3d.environment()` says which). A context restore rebuilds it from the copy kept in memory.
  - Retuned for it:
    - the shelf plastic's reflections come back up, 0.04 → 0.15 (the Stage 4 note)
    - the wood keeps 30 % of its reflections: the studio's overhead lights turned the board tops white at a glancing angle
- [x] Scratches/fingerprint roughness map on the case. `surfaceTextures.ts` draws a 1024² mask on a canvas covering 12 cm: hairline scratches (most along the case's length, as from sliding in and out of a shelf), tiny scuffs, and two fingerprints near the open edge.
  - The case parts' UVs don't agree with each other, so the shader projects the mask along each face's main axis in object space instead.
  - Where the mask is on, roughness goes up to 0.5. Roughness alone left the scratches invisible on clear plastic, so they also scatter back a little light (1.8 % of a matte white surface). So they catch the light and show against dark backgrounds, and barely show elsewhere.
  - **Checkpoint tweak:** fewer and fainter scratches (52 instead of 80), and the hero case is less reflective (env reflections 1.2 → 0.75, specular 1 → 0.8), since a showroom-glossy case didn't fit the wear.
  - Tunable in `SURFACE` (materials.ts) and in `?debug=1`.
- [x] Paper grain (normal + roughness) on the J-card. A tileable 512² height field (noise plus ~2600 short fibres), as a normal map and a roughness map (0.74–0.92), 3 cm per tile. Each J-card panel and both labels get their own repeat, all sharing one upload. Visible in close-ups and on the unfolded card.
- [x] Contact shadows; faked AO on the shelf (no SSAO on mobile).
  - **Contact shadows** (`contactShadows.ts`, the same idea as drei's):
    - An orthographic camera on the floor looks up at the hero tape and renders it into a 512² target. The darkness fades out 2.5 cm above the floor.
    - Blurred twice and shown on a 32 × 24 cm plane under the turntable.
    - It only re-renders when the tape moved, so a tape at rest costs nothing. Hidden while the tape is on the shelf.
  - **Shelf AO** (shader only, nothing baked):
    - the wood darkens towards each cubby's back, corners and board edges, from distances worked out from the layout
    - the cases darken at the foot of their spine, a little under the board above, and deeper in the shelf
    - a hovered case lights up as it slides out
    - Still **6 draw calls** for 150 tapes.
- [ ] Optional: paper-curl vertex bend, if hinged folds feel too stiff. **Not done:** the Stage 3 checkpoint approved the folds as they are.
- [ ] Optional: subtle DOF, desktop high tier only. **Deferred to Stage 7:** it needs the quality tiers to decide who gets it.
- [x] Sound hooks (case click, cassette clack, paper unfold) via Web Audio; mute toggle with saved preference. Human supplies CC0 audio.
  - **Hooks:** the tape machine places a cue on each step's timeline, at the moment something happens. GSAP fires them in both directions, so closing gives the snap as the lid shuts. The cues:
    - case slides out / back in
    - lid unlatches / snaps shut
    - cassette off / back on the spindles, put down on the table
    - J-card slides out / in
    - each crease as it opens or closes
    - card turned over
  - **Checkpoint tweak:** the stand-ins for sliding and (un)folding were swooshes (filtered noise). They're now short taps and ticks like the other sounds.
  - **Files:** each cue plays `public/3d/sounds/<name>.mp3` (names and levels in `SOUND_FILES`, list in `public/3d/CREDITS.md`). **Waiting on the human's CC0 audio.** Until then a synthesised stand-in plays for each (resonant clicks and knocks, filtered-noise paper), so every hook can be heard and timed.
  - The audio starts on the first click or key press (browser autoplay rules). A cue repeated within 45 ms plays once, and at most 8 play at a time (spamming the buttons).
  - **Mute:** a 🔊 / 🔇 button in the shelf toolbar and at the end of the tape's action buttons (`aria-pressed`). Remembered in localStorage as `library3d-sound` (on by default).

**Acceptance:** side-by-side screenshots against vhs.texs.org.

- [ ] **vhs.texs.org can't be reached from the sandbox** (403 from the proxy), so no side-by-side from here. Instead there are before/after pairs against Stage 5, and the new `polish-*.png` shots from `npm run screenshot:3d`. For the real comparison: a screenshot of vhs.texs.org from the human, or the same views side by side on your screen.
- [x] `npm run screenshot:3d` has a Stage 6 part, which checks:
  - the HDRI is what lights the scene
  - contact shadows are on under the hero tape and off on the shelf
  - every step of a walk with the overlay buttons makes its sound, in order
  - the mute switch silences the cues and is still on after a reload, and unmuting is remembered too

  Shots: `polish-threeQuarter`, `-scuffs`, `-scuffs-empty`, `-paper-closeup`, `-label-closeup`, `-unfolded`, `-cassette-on-table`, `-shelf`.
- [x] Everything from Stages 0–5 still passes, including the 3-cycle leak check. The case's scuff mask, the paper grain and the contact shadows' render targets are all freed.

**For the checkpoint (look and sound):**
- **Scratch strength** is a matter of taste. Right now the case looks lightly used, and the scratches show most against the dark background (e.g. the open case behind the J-card). `?debug=1` → Case plastic → scuff roughness, or `SURFACE.scuffScatter`, to taste. Fingerprints are subtle and only show in a highlight.
- **Board tops** read lighter than before: the studio HDRI lights them from above. Say if you'd like them darker.
- **Sounds are stand-ins.** Please pick CC0 recordings for the 8 files in `public/3d/CREDITS.md`, or tell me where to get them; the sandbox can't browse freesound etc. Also: should sound be **on by default** (as now) or off?
- **Cost:** contact shadows re-render the hero tape (another ~150 draw calls) on frames where it moves, e.g. while it auto-spins or animates. Stage 7's tiers can turn them off on low-end devices.

**Human checkpoint.** Answered 2026-09-25: scratches OK but a bit less; the plastic is too shiny for scratches; the slide and (un)fold swooshes should be short pings like the other sounds. All three done. The contact-shadow cost waits for Stage 7. (Still open: the CC0 sound files, and whether sound starts on.)

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
- Approving database/storage changes, image proxying, preference storage (Stages 2 and 5).
- Judging animation timing and feel (Stages 3 and 6).
- Sourcing sound effects (Stage 6).
- Testing on real phones and browsers (Stage 7).
- Launch decisions (Stage 8).

## Progress log

- **2026-09-25 · Stage 6 checkpoint answers applied:** fewer, fainter scratches; less reflective case plastic; slide and (un)fold stand-in sounds are short ticks now. Stage 7 later.

- **2026-09-24 · Stage 6 built** (details under Stage 6): studio HDRI, case scuffs and fingerprints, paper grain, contact shadows, shelf AO, sound cues with stand-in sounds and a remembered mute switch. The two optional items aren't done: paper curl isn't needed, and DOF moves to Stage 7. No side-by-side with vhs.texs.org (unreachable): there are before/after pairs against Stage 5 instead. **Waiting on the human checkpoint** and the CC0 sound files.

- **2026-09-24 · Stage 5 approved** (public shelf included). Stage 6 starts in a new session.

- **2026-09-24 · Stage 5 checkpoint: approved, plus a public shelf.** Built `/user/{username}/3d` with copy / page / print on other people's tapes and a link from the profile page (details under Stage 5). `test:library3d` now 40 checks. **Waiting on the human checkpoint** for the public shelf.

- **2026-09-24 · Stage 5 built** (details under Stage 5): tape panel with details and every 2D action, ＋ New menu and draft note on the shelf, 2D/3D switch remembered in localStorage, `?tape=` following the selection. New `npm run test:library3d` (29 checks). **Waiting on the human checkpoint.** Open: Copy for public tapes (nothing on the shelf to copy) — resolved by the public shelf.

- **2026-09-24 · Stage 5 answers.** Remember the 2D/3D choice in localStorage; no shelf on Explore or /user pages.
- **2026-09-24 · Stage 4 approved.** Stage 5 starts in a new session.
- **2026-09-24 · Stage 4: stored spine thumbnails approved and built** (details under Stage 4, known issues). The shelf shows every saved card's real spine from a ~2 kB file. Render-cache test: 26/26. Stage 4 checkpoint still open for the rest (wood texture, timing/feel, 2D search/sort).
- **2026-09-24 · Stage 4 built** (details under Stage 4): shelf, instanced cases with an atlas of spines, pull-out and fly-in in the tape machine, hover, search and sort in the 3D overlay, empty state, keyboard list, shelf tests in `npm run screenshot:3d`. **Waiting on the human checkpoint.** Open: CC0 wood texture (network), stored spine thumbnails (proposal, ASK FIRST), search/sort for the 2D library (not touched).
- **2026-09-24 · Stage 2 and Stage 3 approved.** Stage 4 starts in a new session.
  - Stage 2 was signed off on the one real card. The two further real cards and the browser check of the real background images (CORS) are **deferred to the end of development**: any tweaks happen then, so they don't interfere with the plan.
- **2026-09-24 · Human answers.**
  - Hide cut guides in 3D: done (pipeline `r2`).
  - Real cards stay **out of git**: they're only checked locally, through `showTape`.
  - `?tape=` takes the **mixtape** id.
- **2026-09-24 · Stage 2 real-data check, card 1 of 3.** Results under Stage 2. Two fixes came out of it:
  - The font report turned `font-family: &quot;Lady Starlight&quot;` into a family called `&quot`. The name is now decoded before parsing (the font itself was fine).
  - After a *jump* to the unfolded card (reduced motion, `?debugState`), the orbit started from the stale camera position, so the card could be framed wrong or cropped. The camera is now placed on the rig first.

  All screenshot, machine, leak and cache tests pass. **Asked the human:** hide cut guides in 3D? May real cards be committed as fixtures?
- **2026-09-23 · Stage D + Stage 0.** Discovery written up above. Stage 0 built: deps, feature flag (runtime config + `?3d=1`, approved), `/library/3d` route (moved `library.vue` → `library/index.vue`), `scene.ts`, debug hooks, `scripts/screenshot-3d.mjs`. Verified with headless screenshots, a 3-cycle leak check and a production build. **Open questions:** which J-card a tape shows (several/none linked); CORS still untested against the real CDNs; there is no library search/sort for Stage 4 to hook into.
- **2026-09-23 · Stage 0 approved.** Human shared reference photos (notes under Stage 1). Stage 1 starts in a new session.
- **2026-09-23 · Decision.** The 3D viewer only shows mixtapes that have a linked J-card (see Discovery).
- **2026-09-24 · Step 3k run on the real project (human). Stage 3 built:** tape machine, picking, overlay, orbit, turn-over, reduced motion, tests (details under Stage 3). **Waiting on the human checkpoint** (timing and feel).
- **2026-09-23 · Render cache approved + hinge change.**
  - Stored renders built as proposed (step 3k), with the hash-based version and viewer write-back described under Stage 2.
  - **Hinge (human request):** the cassette follows the hinge. Both halves hang off pivots on the pin axis. *First attempt (wrong):* the tray swung, carrying the cassette. *Corrected after the second photo set:* the cassette and the whole J-card ride in the **lid**, the lid swings by default, and the tray with the spindle posts stays behind empty. That also fixes the Stage 1 issue where the J-card spine and back flap swept through the cassette while opening (it's all one rigid unit now). `?moving=tray` (or the GUI) swings the tray instead.
  - Also: faces are now one shared texture each (8 instead of 11 textures per mount); the leak check still passes.
- **2026-09-23 · Stage 1 approved.**
- **2026-09-23 · Stage 2 (in progress).** Texture pipeline built: J-card snapshot → per-panel textures, cassette labels, spine thumbnails, runtime cache, tape selection (fixtures / `?tape=` / latest), texture report + debug hooks, Stage 2 screenshots. The leak check still passes with textures on (11 textures per mount, all freed). Production build: the fixtures (75 kB, incl. an inlined font) and html-to-image load only dynamically from the 3D page. **Open:** real-data check (needs rows), CORS against the real hosts, persistent-cache approval.
  - **Persistent cache proposal (ASK FIRST, not built).** Render the J-card on save, in the editor, where it's already mounted and its fonts are loaded. Upload the outside/inside PNGs (≈ 300 dpi, WebP) to a new public bucket `jcard-renders/<user>/<jcard id>-<face>.webp`, and store `render_url`, `render_inside_url` and `render_version` (= `updated_at`) on `jcards`. The 3D view uses them when `render_version` matches `updated_at`, and falls back to rendering at runtime. That needs a migration (2–3 nullable columns), a bucket with RLS like `jcard-images`, and a hook in the J-card save path.
- **2026-09-23 · Stage 1.** Physical objects built procedurally from `dimensions.ts`: case (tray + lid on the pin axis), cassette, hinged placeholder J-card, materials, and a hero turntable view. The Stage 0 placeholder box is gone. New debug params and hooks for views, lid angle, J-card fold, flaps and tint. Fixed a transmission render-target leak (three.js never frees it). Screenshots, the 3-cycle leak check and the production build all pass. Known issues listed under Stage 1. **Waiting on the human checkpoint.**
