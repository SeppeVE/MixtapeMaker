<script setup lang="ts">
import { ref } from 'vue';
import type { Song, Side } from '~/types';
import { searchSpotify } from '~/utils/spotify';
import IconMusicNote from '~icons/material-symbols/music-note-rounded';

const props = defineProps<{
  sideA: Song[];
  sideB: Song[];
  activeSide: Side;
}>();

const emit = defineEmits<{ add: [song: Song, side: Side] }>();

const query = ref('');
const results = ref<Song[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const recentSearches = ref<string[]>([]);

async function runSearch(q: string) {
  if (!q.trim()) return;
  isLoading.value = true;
  error.value = null;
  try {
    const songs = await searchSpotify(q);
    results.value = songs;
    recentSearches.value = [q, ...recentSearches.value.filter((r) => r !== q)].slice(0, 4);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Search failed. Check your Spotify credentials.';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

function pickRecent(r: string) {
  query.value = r;
  runSearch(r);
}

function onTape(song: Song) {
  const onA = props.sideA.some((s) => s.id === song.id);
  const onB = props.sideB.some((s) => s.id === song.id);
  return { onA, onB, onTape: onA || onB };
}
</script>

<template>
  <div class="search-bar">
    <div class="search-window">
      <div class="search-window-title search-window-title--icon"><IconMusicNote class="icon-inline" aria-hidden="true" /> Spotify</div>

      <div class="search-form-area">
        <form class="search-form" @submit.prevent="runSearch(query)">
          <input v-model="query" type="text" placeholder="song, artist…" class="search-input" />
          <button type="submit" :disabled="isLoading" class="btn btn-search">
            {{ isLoading ? '…' : '⌕' }}
          </button>
        </form>

        <div v-if="recentSearches.length > 0" class="recent-chips">
          <span v-for="r in recentSearches" :key="r" class="recent-chip" @click="pickRecent(r)">
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
        <SearchResult
          v-for="song in results"
          :key="song.id"
          :song="song"
          :on-a="onTape(song).onA"
          :on-b="onTape(song).onB"
          :on-tape="onTape(song).onTape"
          :active-side="activeSide"
          @add="(s, side) => emit('add', s, side)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.recent-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.recent-chip {
  font-size: 10px;
  background: var(--color-paper-dk);
  border: 1px solid var(--color-text);
  padding: 2px 6px;
  cursor: pointer;
  font-family: var(--font-body);
  color: var(--color-text);
  line-height: 1.4;
}

.recent-chip:hover { background: var(--color-secondary); }

.btn-clear-results {
  font-size: 11px;
  padding: 2px 5px;
}

.search-error {
  margin-top: 6px;
  font-size: 11px;
  color: var(--color-warning);
  font-family: var(--font-body);
}

/* Results list */
.search-results {
  flex: 1;
  overflow-y: auto;
  border-top: 2px solid var(--color-text);
  background-image: repeating-linear-gradient(
    0deg,
    var(--color-paper) 0px,
    var(--color-paper) 2px,
    var(--color-paper-dk) 2px,
    var(--color-paper-dk) 4px
  );
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-empty {
  font-family: var(--font-display);
  font-size: 16px;
  opacity: 0.5;
  line-height: 1;
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
}

/* Window title variant carrying a leading icon (the Spotify search panel).
   The Explore panels reuse .search-window-title without an icon. */
.search-window-title--icon {
  display: flex;
  align-items: center;
  gap: 5px;
}

@media screen and (max-width: 768px) {
  .search-results {
      flex: none;
      max-height: 320px;
    }
}
</style>
