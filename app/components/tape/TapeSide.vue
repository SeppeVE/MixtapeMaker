<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Song, Side } from '~/types';
import { formatTime, calculateTotalDuration } from '~/utils/timeUtils';

const props = defineProps<{
  side: Side;
  songs: Song[];
  maxDuration: number;
}>();

const emit = defineEmits<{
  removeSong: [songId: string, side: Side];
  reorderSongs: [side: Side, songs: Song[]];
  moveSong: [songId: string, fromSide: Side, toSide: Side];
}>();

const draggedIndex = ref<number | null>(null);

const totalDuration = computed(() => calculateTotalDuration(props.songs));
const pct = computed(() => Math.min(1, totalDuration.value / props.maxDuration));
const over = computed(() => totalDuration.value > props.maxDuration);
const remDur = computed(() => Math.max(0, props.maxDuration - totalDuration.value));
const deadAir = computed(() => !over.value && remDur.value > props.maxDuration * 0.15);
const otherSide = computed<Side>(() => (props.side === 'A' ? 'B' : 'A'));

function handleDragOver(index: number) {
  if (draggedIndex.value === null || draggedIndex.value === index) return;
  const newSongs = [...props.songs];
  const [dragged] = newSongs.splice(draggedIndex.value, 1);
  newSongs.splice(index, 0, dragged);
  draggedIndex.value = index;
  emit('reorderSongs', props.side, newSongs);
}
</script>

<template>
  <div class="tape-side" :data-side="side">
    <!-- Window title bar -->
    <div class="tape-side-header">
      <span class="side-title">⚏ The Deck · Side {{ side }}</span>
      <div :class="`time-info${over ? ' over-limit' : ''}`">
        <span>{{ songs.length }} trk · {{ formatTime(totalDuration) }}</span>
        <span v-if="over" class="time-warning"> ⚠ +{{ formatTime(totalDuration - maxDuration) }}</span>
      </div>
    </div>

    <!-- Song list -->
    <div class="song-list">
      <div v-if="songs.length === 0" class="empty-side">
        ◌ Drop a song here · or press A / B from search
      </div>
      <template v-else>
        <div
          v-for="(song, index) in songs"
          :key="`${song.id}-${index}`"
          class="song-item"
          draggable="true"
          @dragstart="draggedIndex = index"
          @dragover.prevent="handleDragOver(index)"
          @dragend="draggedIndex = null"
        >
          <div class="song-number">{{ String(index + 1).padStart(2, '0') }}</div>
          <img v-if="song.albumCover" :src="song.albumCover" :alt="song.album" class="song-artwork" />
          <div class="song-details">
            <div class="song-item-title">{{ song.title }}</div>
            <div class="song-item-artist">{{ song.artist }} · {{ formatTime(song.duration) }}</div>
          </div>
          <div class="song-actions">
            <button class="btn-icon btn-move" :title="`Move to Side ${otherSide}`" @click="emit('moveSong', song.id, side, otherSide)">
              <span class="btn-move-dest">{{ otherSide }}</span>
              <span class="btn-move-arrow">→</span>
            </button>
            <button class="btn-icon btn-remove" title="Remove" @click="emit('removeSong', song.id, side)">×</button>
          </div>
        </div>
      </template>
    </div>

    <!-- Tape meter footer -->
    <div class="tape-meter-footer">
      <div class="tape-meter-status">
        <span>{{ songs.length }} tracks · {{ formatTime(totalDuration) }}</span>
        <span :class="over ? 'meter-over' : deadAir ? 'meter-deadair' : 'meter-ok'">
          {{ over
            ? `⚠ OVER by ${formatTime(totalDuration - maxDuration)}`
            : deadAir
            ? `⌯ ${formatTime(remDur)} dead air`
            : `◷ ${formatTime(remDur)} left` }}
        </span>
      </div>
      <div class="tape-meter-bar">
        <div :class="`tape-meter-fill${over ? ' fill-over' : ''}`" :style="{ width: `${pct * 100}%` }" />
        <div class="tape-meter-ticks">
          <div v-for="i in 9" :key="i" class="tape-meter-tick" />
          <div class="tape-meter-tick-last" />
        </div>
      </div>
    </div>
  </div>
</template>
