<script setup lang="ts">
import type { Song, Side } from '~/types';
import { formatTime } from '~/utils/timeUtils';

const props = defineProps<{
  song: Song;
  onA: boolean;
  onB: boolean;
  onTape: boolean;
  activeSide: Side;
}>();

const emit = defineEmits<{ add: [song: Song, side: Side] }>();
</script>

<template>
  <div :class="`search-result-item${onTape ? ' on-tape' : ''}`">
    <img v-if="song.albumCover" :src="song.albumCover" :alt="song.album" class="album-cover-small" />
    <div v-else class="album-cover-small album-cover-placeholder" />
    <div class="song-info">
      <div class="song-title">{{ song.title }}</div>
      <div class="song-meta">
        <span>{{ song.artist }} · {{ formatTime(song.duration) }}</span>
        <span v-if="onA" class="on-tape-badge on-tape-badge-a">✓ A</span>
        <span v-if="onB" class="on-tape-badge on-tape-badge-b">✓ B</span>
      </div>
    </div>
    <div class="add-buttons">
      <button
        :class="`btn-side btn-side-a${activeSide === 'A' ? ' active-side' : ''}${onA ? ' on-tape' : ''}`"
        :title="onA ? 'Already on Side A' : 'Add to Side A'"
        @click="!onA && emit('add', song, 'A')"
      >A</button>
      <button
        :class="`btn-side btn-side-b${activeSide === 'B' ? ' active-side' : ''}${onB ? ' on-tape' : ''}`"
        :title="onB ? 'Already on Side B' : 'Add to Side B'"
        @click="!onB && emit('add', song, 'B')"
      >B</button>
    </div>
  </div>
</template>
