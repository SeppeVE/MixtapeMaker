<script setup lang="ts">
import type { Song, Side } from '~/types';
import { searchSpotify } from '~/utils/spotify';
import { formatTime } from '~/utils/timeUtils';
import '~/assets/styles/SearchBar.css';

const props = defineProps<{
  onAddSong: (song: Song, side: Side) => void;
  sideA: Song[];
  sideB: Song[];
  activeSide: Side;
}>();

const query = ref('');
const results = ref<Song[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const recentSearches = ref<string[]>([]);

const runSearch = async (q: string) => {
  if (!q.trim()) return;
  isLoading.value = true;
  error.value = null;
  try {
    const songs = await searchSpotify(q);
    results.value = songs;
    recentSearches.value = [q, ...recentSearches.value.filter((r) => r !== q)].slice(0, 4);
  } catch (err) {
    error.value = 'Search failed. Check your Spotify credentials.';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = () => runSearch(query.value);

const isOnSide = (song: Song, side: Side) =>
  (side === 'A' ? props.sideA : props.sideB).some((s) => s.id === song.id);
</script>

<template>
  <div class="search-bar">
    <div class="search-window">
      <div class="search-window-title">♪ Spotify</div>

      <div class="search-form-area">
        <form class="search-form" @submit.prevent="handleSearch">
          <input
            v-model="query"
            type="text"
            placeholder="song, artist…"
            class="search-input"
          >
          <button type="submit" :disabled="isLoading" class="btn btn-search">
            {{ isLoading ? '…' : '⌕' }}
          </button>
        </form>

        <div v-if="recentSearches.length > 0" class="recent-chips">
          <span
            v-for="r in recentSearches"
            :key="r"
            class="recent-chip"
            @click="query = r; runSearch(r)"
          >
            ↺ {{ r }}
          </span>
        </div>

        <div v-if="results.length > 0" class="search-status-row">
          <div class="search-status">
            {{ results.length }} results · <span class="connected">● spotify</span>
          </div>
          <button class="btn btn-search btn-clear-results" @click="results = []">✕</button>
        </div>

        <div v-if="error" class="search-error">{{ error }}</div>
      </div>

      <div class="search-results">
        <div v-if="results.length === 0 && !isLoading && !error" class="search-empty">
          search for songs to add to your tape
        </div>
        <div
          v-for="song in results"
          :key="song.id"
          :class="`search-result-item${isOnSide(song, 'A') || isOnSide(song, 'B') ? ' on-tape' : ''}`"
        >
          <img v-if="song.albumCover" :src="song.albumCover" :alt="song.album" class="album-cover-small">
          <div v-else class="album-cover-small album-cover-placeholder" />
          <div class="song-info">
            <div class="song-title">{{ song.title }}</div>
            <div class="song-meta">
              <span>{{ song.artist }} · {{ formatTime(song.duration) }}</span>
              <span v-if="isOnSide(song, 'A')" class="on-tape-badge on-tape-badge-a">✓ A</span>
              <span v-if="isOnSide(song, 'B')" class="on-tape-badge on-tape-badge-b">✓ B</span>
            </div>
          </div>
          <div class="add-buttons">
            <button
              :class="`btn-side btn-side-a${activeSide === 'A' ? ' active-side' : ''}${isOnSide(song, 'A') ? ' on-tape' : ''}`"
              :title="isOnSide(song, 'A') ? 'Already on Side A' : 'Add to Side A'"
              @click="!isOnSide(song, 'A') && onAddSong(song, 'A')"
            >A</button>
            <button
              :class="`btn-side btn-side-b${activeSide === 'B' ? ' active-side' : ''}${isOnSide(song, 'B') ? ' on-tape' : ''}`"
              :title="isOnSide(song, 'B') ? 'Already on Side B' : 'Add to Side B'"
              @click="!isOnSide(song, 'B') && onAddSong(song, 'B')"
            >B</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
