<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Mixtape } from '~/types';
import { useUiStore } from '~/stores/ui';
import { exportMixtapeToSpotify, exportMixtapeSidesToSpotify, type ExportResult, type SideExportResult } from '~/utils/spotifyExport';
import { isAuthenticated, clearTokens, startSpotifyAuth } from '~/utils/spotifyAuth';
import { mixtapeFacts } from '~/utils/mixtapeStats';
import { getSpotifyExportMode, setSpotifyExportMode, type SpotifyExportMode } from '~/utils/localStorage';
import IconUpload from '~icons/material-symbols/upload-rounded';

const props = defineProps<{ mixtape: Mixtape }>();
const ui = useUiStore();

type State = 'idle' | 'connecting' | 'exporting' | 'success' | 'error';

// isAuthenticated()/getSpotifyExportMode() read localStorage — must run on the client only.
const connected = ref(false);
const mode = ref<SpotifyExportMode>('combined');
onMounted(() => {
  connected.value = isAuthenticated();
  mode.value = getSpotifyExportMode();
});

const canSplit = computed(() =>
  props.mixtape.sideA.some(s => s.spotifyUri) &&
  props.mixtape.sideB.some(s => s.spotifyUri));
// Falls back to a combined export when the tape can't be split, even if that
// was the last-picked mode (e.g. saved from a different mixtape).
const effectiveMode = computed<SpotifyExportMode>(() => (canSplit.value ? mode.value : 'combined'));

function selectMode(next: SpotifyExportMode) {
  mode.value = next;
  setSpotifyExportMode(next);
}

const state = ref<State>('idle');
const result = ref<ExportResult | SideExportResult[] | null>(null);
const error = ref<string | null>(null);

const busy = computed(() => state.value === 'connecting' || state.value === 'exporting');
const label = computed(() =>
  state.value === 'exporting' ? 'Exporting...'
  : state.value === 'connecting' ? 'Connecting...'
  : connected.value ? (effectiveMode.value === 'split' ? 'Export A & B' : 'Export to Spotify')
  : 'Connect Spotify'
);

const singleResult = computed<ExportResult | null>(() => (result.value && !Array.isArray(result.value) ? result.value : null));
const sideResults = computed<SideExportResult[]>(() => (Array.isArray(result.value) ? result.value : []));
const okSideResults = computed(() => sideResults.value.filter(r => r.status === 'ok' && r.result));
const otherSideResults = computed(() => sideResults.value.filter(r => r.status !== 'ok'));
const combinedAdded = computed(() => okSideResults.value.reduce((sum, r) => sum + (r.result?.addedCount ?? 0), 0));
const combinedSkipped = computed(() => okSideResults.value.reduce((sum, r) => sum + (r.result?.skippedCount ?? 0), 0));
// Only one cover-scope note is shown even though it can affect both playlists.
const coverError = computed(() => okSideResults.value.find(r => !r.result?.coverSet)?.result?.coverError);

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
    if (effectiveMode.value === 'split') {
      const sides = await exportMixtapeSidesToSpotify(props.mixtape);
      result.value = sides;
      const failedCover = sides.find(s => s.status === 'ok' && s.result && !s.result.coverSet);
      if (failedCover) console.warn('Spotify playlist cover not set:', failedCover.result?.coverError);
    } else {
      const single = await exportMixtapeToSpotify(props.mixtape);
      result.value = single;
      if (!single.coverSet) console.warn('Spotify playlist cover not set:', single.coverError);
    }
    state.value = 'success';
    // The export is already done; the modal only confirms it and hands over the link(s).
    if (Array.isArray(result.value)) {
      const ok = result.value.filter((s): s is SideExportResult & { result: ExportResult } => s.status === 'ok' && !!s.result);
      const addedCount = ok.reduce((sum, s) => sum + s.result.addedCount, 0);
      const skippedCount = ok.reduce((sum, s) => sum + s.result.skippedCount, 0);
      const notes = result.value.filter(s => s.status !== 'ok').map(s => s.error).filter((n): n is string => !!n);
      const noteParts = [
        skippedCount > 0 ? `${addedCount} added · ${skippedCount} skipped (not on Spotify)` : null,
        ...notes,
      ].filter((n): n is string => !!n);
      ui.openSuccessModal({
        title: ok.length > 1 ? 'Playlists created' : 'Playlist created',
        trigger: 'spotify',
        links: ok.map(s => ({ url: s.result.playlistUrl, openLabel: `Open Side ${s.side}` })),
        note: noteParts.length ? noteParts.join(' · ') : undefined,
        facts: mixtapeFacts(props.mixtape),
      });
    } else {
      const { playlistUrl, addedCount, skippedCount } = result.value;
      ui.openSuccessModal({
        title: 'Playlist created',
        trigger: 'spotify',
        link: { url: playlistUrl, openLabel: 'Open in Spotify' },
        note: skippedCount > 0
          ? `${addedCount} added · ${skippedCount} skipped (not on Spotify)`
          : undefined,
        facts: mixtapeFacts(props.mixtape),
      });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Export failed';
    state.value = 'error';
  }
}
</script>

<template>
  <div class="export-spotify">
    <div v-if="canSplit" class="export-mode-toggle">
      <button
        type="button"
        class="btn action-btn export-mode-btn"
        :class="{ 'export-mode-btn--active': effectiveMode === 'combined' }"
        :disabled="busy"
        @click="selectMode('combined')"
      >
        One playlist
      </button>
      <button
        type="button"
        class="btn action-btn export-mode-btn"
        :class="{ 'export-mode-btn--active': effectiveMode === 'split' }"
        :disabled="busy"
        @click="selectMode('split')"
      >
        A and B separately
      </button>
    </div>

    <div v-if="state === 'success' && sideResults.length" class="export-result">
      <a
        v-for="side in okSideResults"
        :key="side.side"
        class="btn action-btn export-btn--success"
        :href="side.result!.playlistUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Side {{ side.side }} ↗
      </a>
      <p v-for="side in otherSideResults" :key="`note-${side.side}`" class="export-skipped">
        {{ side.status === 'empty' ? side.error : `Side ${side.side} failed: ${side.error}` }}
      </p>
      <p v-if="combinedSkipped > 0" class="export-skipped">
        {{ combinedAdded }} added · {{ combinedSkipped }} skipped (not on Spotify)
      </p>
      <p v-if="coverError" class="export-skipped">{{ coverError }}</p>
    </div>
    <div v-else-if="state === 'success' && singleResult" class="export-result">
      <a class="btn action-btn export-btn--success" :href="singleResult.playlistUrl" target="_blank" rel="noopener noreferrer">
        Open Playlist ↗
      </a>
      <p v-if="singleResult.skippedCount > 0" class="export-skipped">
        {{ singleResult.addedCount }} added · {{ singleResult.skippedCount }} skipped (not on Spotify)
      </p>
    </div>
    <div v-else-if="state === 'error'" class="export-result">
      <p class="export-error">{{ error }}</p>
      <button class="btn action-btn" @click="state = 'idle'">Retry</button>
    </div>
    <button v-else class="btn action-btn" :disabled="busy" @click="handleClick">
      <IconUpload v-if="connected && !busy" class="icon-inline" aria-hidden="true" />
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
