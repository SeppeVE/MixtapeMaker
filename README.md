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

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Upcoming Features (Stage 3)

- Share mixtapes with others via unique links
- Public mixtape gallery
- Collaborative mixtapes
- Export mixtapes as Spotify playlists

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
