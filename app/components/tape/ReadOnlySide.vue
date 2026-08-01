<script setup lang="ts">
import type { Song } from '~/types';
import { formatTime, calculateTotalDuration } from '~/utils/timeUtils';

defineProps<{ label: string; songs: Song[] }>();
</script>

<template>
  <div class="tape-side">
    <div class="tape-side-header">
      <span class="side-title">⚏ {{ label }}</span>
      <span>{{ songs.length }} trk · {{ formatTime(calculateTotalDuration(songs)) }}</span>
    </div>
    <div class="song-list">
      <div v-if="songs.length === 0" class="empty-side">◌ No tracks</div>
      <template v-else>
        <div v-for="(song, index) in songs" :key="`${song.id}-${index}`" class="song-item">
          <div class="song-number">{{ String(index + 1).padStart(2, '0') }}</div>
          <img v-if="song.albumCover" :src="song.albumCover" :alt="song.album" class="song-artwork" />
          <div class="song-details">
            <div class="song-item-title">{{ song.title }}</div>
            <div class="song-item-artist">{{ song.artist }} · {{ formatTime(song.duration) }}</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
