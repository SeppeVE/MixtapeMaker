# Mixtape Creator

A retro-styled web application for creating cassette mixtapes using the Spotify API.

## Features

### Stage 1 - MVP
- 🎵 Search for songs using Spotify API
- 📼 Create mixtapes with A and B sides
- ⏱️ Track duration with cassette length options (60, 90, 120 minutes)
- 🎨 Retro j-card inspired design with red stripes and blue text
- 🔄 Drag and drop to reorder songs
- ↔️ Move songs between sides
- 💾 Auto-save to local storage
- ⚠️ Warnings when exceeding cassette side limits

### Stage 2 - Cloud Storage & Authentication (Current)
- 🔐 User authentication (sign up/sign in)
- ☁️ Save mixtapes to the cloud
- 📚 Personal library to manage multiple mixtapes
- 🔄 Load previously saved mixtapes
- 🗑️ Delete mixtapes from your library
- 👤 User profiles with username, profile picture and a public page at `/user/{username}` (can be set to private)
- 🎴 Public J-cards, shown on your profile and on the linked mixtape's Explore page
- 🔍 Explore tabs for browsing public mixtapes *and* public J-cards, with search and live card previews
- ⧉ Copy any public mixtape or J-card into your own library and make it yours
- 🖨️ Export any public J-card to a print-ready PDF (A4, US Letter or fit-to-card)
- ★ "What's new" notifications for signed-in users, posted from the `/admin` panel
- 📼 3D library: your mixtapes as cassette cases on a wooden shelf. Take one out, open the case, slide the cassette out and unfold your J-card in 3D; a public shelf on every profile too (`/library/3d`, `/user/{username}/3d`)

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Spotify Developer Account
- Supabase Account (for cloud features)

### Getting Spotify API Credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in or create an account
3. Click "Create an App"
4. Fill in the app details
5. Copy your Client ID and Client Secret

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Spotify credentials:

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Open the `.env` file and add your Spotify credentials:
```
VITE_SPOTIFY_CLIENT_ID=your_actual_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_actual_client_secret
```

3. Set up Supabase (for cloud features):

Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:
- Create a Supabase project
- Set up the database schema
- Get your Supabase credentials

Then add your Supabase credentials to `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to the URL shown (usually http://localhost:5173)

## Usage

1. **Sign in** (optional): Click "Sign In / Sign Up" to create an account for cloud features
2. **Search for songs**: Use the search bar to find songs on Spotify
3. **Add to sides**: Click "+ A" or "+ B" to add songs to Side A or Side B
4. **Manage songs**:
   - Drag and drop to reorder songs within a side
   - Click "↔" to move a song to the other side
   - Click "×" to remove a song
5. **Set cassette length**: Choose 60, 90, or 120 minutes from the dropdown
6. **Name your mixtape**: Click on the title to edit it
7. **Save to cloud**: Click "Save to Cloud" to store your mixtape (requires sign in)
8. **View library**: Click "My Library" to see all your saved mixtapes
9. **Auto-save**: Your current mixtape is automatically saved to local storage

## 3D library

`/library/3d` shows the library as cassette cases on a shelf, and `/user/{username}/3d` a
profile's public tapes. It's switched on for everyone (`NUXT_PUBLIC_LIBRARY3D=false`
switches it off; `?3d=1` then still opens it for one visit). The library opens in 2D
until someone flips the 2D | 3D switch, which is remembered in `localStorage`.

**How it's built**

- **Plain three.js, no framework wrapper.** Everything 3D lives in framework-free TypeScript
  under `app/lib/cassette3d/`. One composable, `useCassetteScene`, connects it to Vue, and
  Vue only renders the HTML overlay (`app/components/cassette3d/`). three.js is imported
  when the view mounts, so no other page loads it (`npm run check:bundle-3d` checks this
  after a build).
- **Geometry in code.** The case, cassette and hinged J-card are built procedurally from
  the numbers in `dimensions.ts` (1 unit = 1 cm; the J-card sizes are the PDF export's).
- **Textures from the real J-card.** The existing printable J-card components are
  rendered off screen with html-to-image (`textures/jcardSnapshot.ts`) and mapped onto
  each panel. A render is stored in Supabase Storage on save (`jcard-renders` bucket,
  `jcards.render`), so the 3D view usually just downloads it. Spines on the shelf come
  from one atlas texture.
- **One state machine moves the tape** (`animation/tapeMachine.ts`): onShelf → pulledOut →
  presented → lidOpen → cassetteOut → jcardOut → jcardUnfolded. Each step is one GSAP
  timeline, played backwards to go back. Durations and eases live in `animation/config.ts`.
- **The shelf is instanced:** every case in a handful of draw calls, however many
  tapes there are (`shelf/`).
- **Quality tiers** (`quality.ts`): high, mid or low, picked from the device and
  stepped down by a frame-time probe. `?tier=` forces one. They set transmission,
  shadows, depth of field, texture sizes and the pixel ratio.
- **Robustness:** a lost WebGL context rebuilds the scene; without WebGL 2 the page goes
  to the 2D library with a note; errors reach Sentry tagged `feature: library3d`.
- **Assets:** a CC0 studio HDRI in `public/3d/` (credits in `public/3d/CREDITS.md`).
  Scratches, paper grain, wood and sounds are generated in code.

**Working on it:** the debug tools exist in the dev build only.

- `?debug=1` shows a tuning GUI and fps.
- `?debugState=`, `?fixture=` and `?seed=` jump to a state or load sample tapes.
- `window.__cassette3d` exposes hooks for tests.
- With `npm run dev` running, `npm run screenshot:3d`, `npm run test:library3d` and
  `npm run test:render-cache` run the browser checks.
- The full design and history is in `docs/3d-library-plan.md`.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Upcoming Features (Stage 3)

- Share mixtapes with others via unique links
- Public mixtape gallery
- Collaborative mixtapes
- Export mixtapes as Spotify playlists (as one playlist, or Side A and Side B separately)

## Tech Stack

- React 18
- TypeScript
- Vite
- Spotify Web API
- Supabase (Authentication & Database)
- Local Storage API

## Design Philosophy

The design is inspired by classic cassette j-cards with:
- Bold typography
- Pastel color palette
- Red stripe accents
- Blue text reminiscent of handwritten cassette labels
- Modern but retro aesthetic

## License

MIT
