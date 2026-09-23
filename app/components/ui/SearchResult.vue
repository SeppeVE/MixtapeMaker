<script setup lang="ts">
import type { Song, Side } from '~/types';
import { formatTime } from '~/utils/timeUtils';
import IconCheck from '~icons/material-symbols/check-rounded';

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
        <span v-if="onA" class="on-tape-badge on-tape-badge-a"><IconCheck class="icon-inline" aria-hidden="true" /> A</span>
        <span v-if="onB" class="on-tape-badge on-tape-badge-b"><IconCheck class="icon-inline" aria-hidden="true" /> B</span>
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

<style scoped>
.search-result-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-white);
  border: 1.5px solid var(--color-text);
  box-shadow: var(--shadow-sm);
  padding: 5px;
  flex-shrink: 0;
}

.search-result-item.on-tape {
  background: var(--color-paper-dk);
  opacity: 0.72;
}

.album-cover-small {
  width: 30px;
  height: 30px;
  object-fit: cover;
  border: 1.5px solid var(--color-text);
  flex-shrink: 0;
  display: block;
}

.album-cover-placeholder {
  background: var(--color-forest);
  background-image: repeating-linear-gradient(
    -45deg,
    transparent 0px, transparent 3px,
    rgba(0,0,0,.2) 3px, rgba(0,0,0,.2) 6px
  );
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-weight: 700;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.song-meta {
  font-size: 10px;
  color: var(--color-text-light);
  display: flex;
  gap: 5px;
  align-items: center;
  margin-top: 2px;
  line-height: 1;
  flex-wrap: wrap;
}

.on-tape-badge {
  font-family: var(--font-display);
  font-size: 11px;
  line-height: 1;
  padding: 1px 4px 0;
  border: 1px solid var(--color-text);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.on-tape-badge-a { background: var(--color-forest); color: var(--color-paper); }

.on-tape-badge-b { background: var(--color-primary); color: var(--color-paper); }

.add-buttons {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.btn-side {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1;
  border: 1.5px solid var(--color-text);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.06s, box-shadow 0.06s;
  letter-spacing: 0;
}

.btn-side-a { background: var(--color-forest); color: var(--color-paper); box-shadow: 1px 1px 0 var(--color-text); }

.btn-side-b { background: var(--color-primary); color: var(--color-paper); box-shadow: 1px 1px 0 var(--color-text); }

.btn-side.active-side {
  outline: 2px solid var(--color-secondary);
  outline-offset: 1px;
}

.btn-side.on-tape {
  opacity: 0.45;
  box-shadow: none;
  cursor: default;
}

.btn-side:not(.on-tape):active {
  transform: translate(1px,1px);
  box-shadow: none;
}
</style>
