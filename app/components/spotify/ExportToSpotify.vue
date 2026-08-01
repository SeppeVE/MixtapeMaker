<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Mixtape } from '~/types';
import { exportMixtapeToSpotify, type ExportResult } from '~/utils/spotifyExport';
import { isAuthenticated, clearTokens, startSpotifyAuth } from '~/utils/spotifyAuth';

const props = defineProps<{ mixtape: Mixtape }>();

type State = 'idle' | 'connecting' | 'exporting' | 'success' | 'error';

// isAuthenticated() reads localStorage — must run on the client only.
const connected = ref(false);
onMounted(() => { connected.value = isAuthenticated(); });

const state = ref<State>('idle');
const result = ref<ExportResult | null>(null);
const error = ref<string | null>(null);

const busy = computed(() => state.value === 'connecting' || state.value === 'exporting');
const label = computed(() =>
  state.value === 'exporting' ? 'Exporting...'
  : state.value === 'connecting' ? 'Connecting...'
  : connected.value ? '⬆ Export to Spotify'
  : 'Connect Spotify'
);

function handleDisconnect() {
  clearTokens();
  connected.value = false;
  state.value = 'idle';
  result.value = null;
}

async function handleClick() {
  if (!connected.value) {
    state.value = 'connecting';
    try {
      await startSpotifyAuth();
    } catch {
      state.value = 'error';
      error.value = 'Could not start Spotify login. Check NUXT_PUBLIC_SPOTIFY_CLIENT_ID.';
    }
    return;
  }

  state.value = 'exporting';
  error.value = null;
  try {
    result.value = await exportMixtapeToSpotify(props.mixtape);
    state.value = 'success';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Export failed';
    state.value = 'error';
  }
}
</script>

<template>
  <div class="export-spotify">
    <div v-if="state === 'success' && result" class="export-result">
      <a class="btn action-btn export-btn--success" :href="result.playlistUrl" target="_blank" rel="noopener noreferrer">
        Open Playlist ↗
      </a>
      <p v-if="result.skippedCount > 0" class="export-skipped">
        {{ result.addedCount }} added · {{ result.skippedCount }} skipped (not on Spotify)
      </p>
    </div>
    <div v-else-if="state === 'error'" class="export-result">
      <p class="export-error">{{ error }}</p>
      <button class="btn action-btn" @click="state = 'idle'">Retry</button>
    </div>
    <button v-else class="btn action-btn" :disabled="busy" @click="handleClick">
      {{ label }}
    </button>

    <div class="export-spotify-status">
      <span :class="`export-dot export-dot--${connected ? 'on' : 'off'}`" />
      <span class="export-status-label">
        {{ connected ? 'Spotify linked' : 'Not linked to Spotify' }}
      </span>
      <button v-if="connected" class="export-disconnect" @click="handleDisconnect">disconnect</button>
    </div>
  </div>
</template>
