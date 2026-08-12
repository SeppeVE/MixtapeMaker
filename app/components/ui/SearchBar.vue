<script setup lang="ts">
import { ref } from 'vue';
import type { Song, Side } from '~/types';
import { searchSpotify } from '~/utils/spotify';

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
      <div class="search-window-title">♪ Spotify</div>

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
